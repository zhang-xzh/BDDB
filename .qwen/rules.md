# BDDB Development Rules

## Type Consistency
- Frontend/backend/DB use **same types** from `lib/db/schema.ts`.
- `Torrent` extends `@ctrl/qbittorrent` types.
- Field names must be **identical** across layers.

## Type Definitions
- All types defined in `lib/db/schema.ts`.
- Do NOT create duplicate types in other files.
- Import types from `@/lib/db/schema`.

## API Conventions
- API routes use `Node.js` runtime (not Edge).
- Response format: `{ success: boolean, data?: string, error?: string }`.
- Data is JSON.stringified in response.

## Component Conventions
- Client components: `'use client'` directive.
- Ant Design 6 components.
- No direct DOM manipulation.

## Database Conventions
- NeDB collections: `torrents`, `files`, `volumes`.
- All documents have `is_deleted` and `synced_at` fields.
- Use repository pattern for data operations.

## File Naming
- Components: PascalCase (e.g., `DiscEditor.tsx`).
- Utilities: camelCase (e.g., `api.ts`).
- Routes: `route.ts` in folder.

## Build & Run
```bash
npm run build    # Always verify build before commit
npm run dev      # Development
npm run start    # Production
```

## Database Conventions (SQLite & JSON Optimized)

### 1. 核心引擎与连接初始化
- **驱动选择**: 必须使用 `better-sqlite3`。禁止使用异步 `sqlite3` 库以确保在 Node.js 环境下获得最优的同步写入吞吐量。
- **高性能预设**: 每次建立连接后，必须立即执行以下配置（PRAGMA）：
  ```typescript
  const db = new Database('bddb.sq3');
  db.pragma('journal_mode = WAL');      // 开启预写日志，支持并发读写
  db.pragma('synchronous = NORMAL');    // 提升写入速度，降低磁盘 IO 压力
  db.pragma('foreign_keys = ON');       // 开启外键约束校验
  db.pragma('cache_size = -64000');     // 分配 64MB 内存缓存，加速百万级索引检索
  db.pragma('mmap_size = 268435456');   // 开启 256MB 内存映射，提升大文件读取效率



### 2. JSON 存储与数组外键处理

* **存储格式**: QB API 返回的嵌套对象及数组统一以 `TEXT` 格式存储，入库前执行 `JSON.stringify()`。
* **数组外键查询**: 针对 JSON 数组字段（如 `tags`, `file_ids`），必须使用 `json_each` 函数进行关联查询。
```sql
-- 高效关联数组内 ID 的查询模式
SELECT t.* FROM torrents t, json_each(t.data, '$.category_ids') as cat
WHERE cat.value = ?;

```


* **虚拟列优化**: 对于百万级数据中频繁作为过滤条件的 JSON 字段，必须定义 `VIRTUAL` 生成列并建立索引：
```sql
-- 在 schema.ts 定义中增加虚拟索引列
ALTER TABLE torrents ADD COLUMN qb_id GENERATED ALWAYS AS (json_extract(data, '$.id')) VIRTUAL;
CREATE INDEX idx_qb_id ON torrents(qb_id);

```



### 3. 高性能写入规范 (Million-row Scale)

* **批量事务**: 严禁单条插入。同步数据时必须使用 `db.transaction()`，单次事务建议处理 **5,000 - 10,000** 条记录。
* **预编译语句**: 必须在循环外使用 `db.prepare()`。
```typescript
const insert = db.prepare('INSERT INTO torrents (data, synced_at) VALUES (?, ?)');
const insertMany = db.transaction((items) => {
  for (const item of items) insert.run(JSON.stringify(item), Date.now());
});

```



### 4. 强制字段与审计

* **基础字段**: 所有表必须包含以下三列：
* `id`: `INTEGER PRIMARY KEY AUTOINCREMENT` 或 `TEXT PRIMARY KEY` (对应 QB UID)。
* `is_deleted`: `INTEGER` (0/1)，执行逻辑删除。
* `synced_at`: `INTEGER` (Unix Timestamp)，记录最后同步时间。



### 5. Repository 模式实现要求

* **输入转换**: 将 API 的 `camelCase` JSON 映射为 DB 的 `snake_case` 字段。
* **类型安全**: 从 SQLite 返回的数据必须通过 `lib/db/schema.ts` 定义的类型断言，并将 `0/1` 映射回 `boolean`。
