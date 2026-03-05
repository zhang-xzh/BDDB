# Database Conventions (Type Constraints & Serialization)

## 1. 数据类型绑定限制 (Binding Constraints)

**核心规则**: SQLite3 原生仅支持 `number`, `string`, `bigint`, `buffer`, `null`。

**对象/数组转换**: 
- 严禁直接向 `db.prepare().run(obj)` 传入对象。
- 所有 QB API 返回的嵌套对象及数组，在写入前必须通过 `JSON.stringify()` 转换为 `string`。
- 从数据库读取后，必须在 Repository 层通过 `JSON.parse()` 恢复为 TypeScript 类型。

## 2. 高效序列化模式 (Repository 实现)

**写入范式**: 使用 `better-sqlite3` 的 `db.transaction` 配合 `JSON.stringify` 进行批量处理。

**转换工具函数** (在 `lib/db/repository.ts` 中定义):

```typescript
// Torrent 序列化
function toDbTorrent(torrent: Partial<Torrent>): { qb_torrent: string; is_deleted: number; synced_at: number } {
  return {
    qb_torrent: JSON.stringify(torrent.qb_torrent),
    is_deleted: torrent.is_deleted ? 1 : 0,
    synced_at: torrent.synced_at ?? now(),
  }
}

function fromDbTorrent(row: any): Torrent {
  return {
    ...row,
    qb_torrent: JSON.parse(row.qb_torrent),
    is_deleted: !!row.is_deleted,
  } as Torrent
}

// TorrentFile 序列化
function toDbTorrentFile(file: Partial<TorrentFile>): { qb_torrent_file: string; is_deleted: number; synced_at: number } {
  return {
    qb_torrent_file: JSON.stringify(file.qb_torrent_file),
    is_deleted: file.is_deleted ? 1 : 0,
    synced_at: file.synced_at ?? now(),
  }
}

function fromDbTorrentFile(row: any): TorrentFile {
  return {
    ...row,
    qb_torrent_file: JSON.parse(row.qb_torrent_file),
    is_deleted: !!row.is_deleted,
  } as TorrentFile
}

// Volume files 序列化
function toDbVolumeFiles(fileIds: string[]): string {
  return JSON.stringify(fileIds)
}

function fromDbVolumeFiles(jsonStr: string): string[] {
  return JSON.parse(jsonStr)
}

function fromDbVolume(row: any): Volume {
  return {
    ...row,
    torrent_file_ids: fromDbVolumeFiles(row.torrent_file_ids),
    is_deleted: !!row.is_deleted,
  } as Volume
}
```

## 3. JSON 字段查询与索引 (JSON1)

**查询绑定**: 即使存储的是字符串，查询时应利用 SQLite 的 JSON 函数提取值，而非在内存中处理。

```typescript
// 使用 json_extract 查询 JSON 字段
const stmt = db.prepare(`
  SELECT * FROM torrents 
  WHERE json_extract(qb_torrent, '$.hash') = ?
`)
```

**表达式索引**:

```sql
-- Torrent 索引
CREATE INDEX idx_torrents_hash ON torrents((json_extract(qb_torrent, '$.hash')));
CREATE INDEX idx_torrents_name ON torrents((json_extract(qb_torrent, '$.name')));
CREATE INDEX idx_torrents_state ON torrents((json_extract(qb_torrent, '$.state')));
CREATE INDEX idx_torrents_category ON torrents((json_extract(qb_torrent, '$.category')));

-- Volume files 数组查询 (LIKE 匹配)
-- torrent_file_ids: ["file_id_1", "file_id_2"]
WHERE torrent_file_ids LIKE '%"file_id_1"%'
```

## 4. 数据映射规范 (Mapping)

| TypeScript | SQLite | 说明 |
|------------|--------|------|
| `boolean` | `INTEGER` | 0 或 1 |
| `Date` | `INTEGER` | Unix Timestamp (秒) |
| `object` | `TEXT` | JSON.stringify() |
| `array` | `TEXT` | JSON.stringify() |
| `bigint` | `INTEGER` | 文件大小/字节数 |

## 5. 错误处理

**类型检查**: 在 `run()` 之前必须验证参数类型，防止传入 `undefined`（SQLite 不接受 `undefined`，必须显式转为 `null`）。

**事务处理**: 批量操作使用 `db.transaction()` 确保原子性：

```typescript
const transaction = db.transaction(() => {
  db.prepare(`DELETE FROM torrent_files WHERE torrent_id = ?`).run(torrentId)
  
  const insert = db.prepare(`
    INSERT INTO torrent_files (_id, torrent_id, qb_torrent_file, is_deleted, synced_at)
    VALUES (?, ?, ?, ?, ?)
  `)
  
  for (const f of files) {
    const doc = { _id: ..., torrent_id: ..., ...toDbTorrentFile(f) }
    insert.run(doc._id, doc.torrent_id, doc.qb_torrent_file, doc.is_deleted, doc.synced_at)
  }
})

await transaction()
```

## 6. 性能优化

### SQLite 配置优化

```typescript
// lib/db/index.ts
db.pragma('journal_mode = WAL')          // 预写日志，支持并发读写
db.pragma('synchronous = NORMAL')        // 提升写入速度，降低磁盘 IO
db.pragma('cache_size = -64000')         // 64MB 缓存，加速索引检索
db.pragma('mmap_size = 268435456')       // 256MB 内存映射，提升大文件读取
db.pragma('foreign_keys = ON')           // 外键约束
db.pragma('temp_store = MEMORY')         // 临时存储使用内存
```

### 批量写入模式

**❌ 慢：逐条写入（每条都同步磁盘）**
```typescript
for (const t of torrents) {
  await addTorrent(t)           // 1 次事务
  await saveTorrentFiles(...)   // 1 次事务
}
// 1000 个 torrent = 2000 次事务 = ~2 秒
```

**✅ 快：批量事务（单次同步磁盘）**
```typescript
const transaction = db.transaction(() => {
  // 收集所有数据
  for (const t of torrents) {
    insertTorrents.push(...)
    allFiles.push(...)
  }
  
  // 单次事务批量写入
  for (const t of insertTorrents) {
    insertTorrent.run(...)
  }
  for (const f of allFiles) {
    insertFile.run(...)
  }
})
await transaction()
// 1000 个 torrent + 10 万文件 = 1 次事务 = ~0.1 秒
```

### 性能对比

| 场景 | 优化前 | 优化后 |
|------|--------|--------|
| 写入 1000 torrent | ~2 秒 | ~0.1 秒 |
| 写入 10 万 files | ~10 秒 | ~0.5 秒 |
| 吞吐量 | ~1 MB/s | ~50-100 MB/s |

### 预编译语句

使用 `db.prepare()` 避免重复解析 SQL：

```typescript
// ❌ 慢：每次解析 SQL
db.exec(`INSERT INTO torrents (...) VALUES (...)`)

// ✅ 快：预编译后复用
const stmt = db.prepare(`INSERT INTO torrents (...) VALUES (...)`)
for (const t of torrents) {
  stmt.run(...)
}
```
