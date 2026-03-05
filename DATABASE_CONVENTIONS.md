# Database Conventions & Best Practices

## Overview

This document defines the database layer conventions for the BDDB project, ensuring type safety, performance optimization, and consistent data access patterns when working with SQLite and qBittorrent API data.

## 1. SQLite Type Binding Constraints

**Core Rule**: SQLite only accepts these JavaScript types: `number`, `string`, `bigint`, `buffer`, `null`.

**Object/Array Serialization**:
- **Never pass objects directly** to `db.prepare().run(obj)`
- All nested objects and arrays from QB API must be serialized with `JSON.stringify()` before insertion
- After database retrieval, deserialize with `JSON.parse()` in the Repository layer

## 2. Efficient Serialization Pattern (Repository Implementation)

**Write Pattern**: Use `better-sqlite3`'s `db.transaction` with `JSON.stringify` for batch processing.

**Transformation Utilities** (defined in `lib/db/repository.ts`):

```typescript
// Torrent serialization
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

// TorrentFile serialization
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

// Volume files serialization
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

## 3. JSON Field Querying & Indexing (JSON1)

**Query Binding**: Even though data is stored as strings, use SQLite's JSON functions to extract values instead of processing in memory.

```typescript
// Use json_extract to query JSON fields
const stmt = db.prepare(`
  SELECT * FROM torrents 
  WHERE json_extract(qb_torrent, '$.hash') = ?
`)
```

**Expression Indexes**:

```sql
-- Torrent indexes
CREATE INDEX idx_torrents_hash ON torrents((json_extract(qb_torrent, '$.hash')));
CREATE INDEX idx_torrents_name ON torrents((json_extract(qb_torrent, '$.name')));
CREATE INDEX idx_torrents_state ON torrents((json_extract(qb_torrent, '$.state')));
CREATE INDEX idx_torrents_category ON torrents((json_extract(qb_torrent, '$.category')));

-- Volume files array query (LIKE matching)
-- torrent_file_ids: ["file_id_1", "file_id_2"]
WHERE torrent_file_ids LIKE '%"file_id_1"%'
```

## 4. Type-Database Mapping

| TypeScript | SQLite | Description |
|------------|--------|-------------|
| `boolean` | `INTEGER` | 0 or 1 |
| `Date` | `INTEGER` | Unix Timestamp (seconds) |
| `object` | `TEXT` | JSON.stringify() |
| `array` | `TEXT` | JSON.stringify() |
| `bigint` | `INTEGER` | File size/bytes |

## 5. Error Handling

**Type Checking**: Always validate parameter types before `run()` to prevent passing `undefined` (SQLite doesn't accept `undefined`, must explicitly convert to `null`).

**Transaction Handling**: Use `db.transaction()` for batch operations to ensure atomicity:

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

## 6. Performance Optimization

### SQLite Configuration Optimization

```typescript
// lib/db/index.ts
db.pragma('journal_mode = WAL')          // Write-ahead logging for concurrent reads/writes
db.pragma('synchronous = NORMAL')        // Faster writes, reduced disk I/O
db.pragma('cache_size = -64000')         // 64MB cache for faster index lookups
db.pragma('mmap_size = 268435456')       // 256MB memory mapping for large file reads
db.pragma('foreign_keys = ON')           // Enforce foreign key constraints
db.pragma('temp_store = MEMORY')         // Use memory for temporary storage
```

### Batch Write Pattern

**❌ Slow: Individual Writes (each syncs to disk)**
```typescript
for (const t of torrents) {
  await addTorrent(t)           // 1 transaction
  await saveTorrentFiles(...)   // 1 transaction
}
// 1000 torrents = 2000 transactions = ~2 seconds
```

**✅ Fast: Batch Transaction (single disk sync)**
```typescript
const transaction = db.transaction(() => {
  // Collect all data
  for (const t of torrents) {
    insertTorrents.push(...)
    allFiles.push(...)
  }
  
  // Single transaction batch insert
  for (const t of insertTorrents) {
    insertTorrent.run(...)
  }
  for (const f of allFiles) {
    insertFile.run(...)
  }
})
await transaction()
// 1000 torrents + 100k files = 1 transaction = ~0.1 seconds
```

### Performance Comparison

| Scenario | Before | After |
|----------|--------|-------|
| Write 1,000 torrents | ~2 seconds | ~0.1 seconds |
| Write 100,000 files | ~10 seconds | ~0.5 seconds |
| Throughput | ~1 MB/s | ~50-100 MB/s |

### Prepared Statements

Use `db.prepare()` to avoid repeated SQL parsing:

```typescript
// ❌ Slow: Parse SQL each time
db.exec(`INSERT INTO torrents (...) VALUES (...)`)

// ✅ Fast: Prepare once, reuse
const stmt = db.prepare(`INSERT INTO torrents (...) VALUES (...)`)
for (const t of torrents) {
  stmt.run(...)
}
```
