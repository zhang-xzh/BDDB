// SQLite 数据库连接模块（持久化存储）
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DATA_PATH = path.join(process.cwd(), 'data')
let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(DATA_PATH, { recursive: true })
    db = new Database(path.join(DATA_PATH, 'bddb.sqlite'), {
      verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
    })
    db.pragma('journal_mode = WAL')
    db.pragma('synchronous = NORMAL')
    db.pragma('cache_size = -64000')
    db.pragma('mmap_size = 268435456')
    db.pragma('foreign_keys = ON')
    db.pragma('temp_store = MEMORY')
    initSchema(db)
  }
  return db
}

function initSchema(db: Database.Database) {
  // 建表
  db.exec(`
    CREATE TABLE IF NOT EXISTS torrents (
      id TEXT PRIMARY KEY,
      hash TEXT UNIQUE,
      added_on INTEGER,
      qb_torrent TEXT NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      synced_at INTEGER
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS torrent_files (
      id TEXT PRIMARY KEY,
      torrent_id TEXT NOT NULL,
      qb_torrent_file TEXT NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      synced_at INTEGER
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS volumes (
      id TEXT PRIMARY KEY,
      torrent_id TEXT NOT NULL,
      torrent_file_ids TEXT NOT NULL,
      type TEXT,
      volume_no INTEGER,
      sort_order INTEGER,
      volume_name TEXT,
      catalog_no TEXT,
      suruga_id TEXT,
      note TEXT,
      title TEXT,
      release_date TEXT,
      maker TEXT,
      version_type TEXT,
      bonus_status TEXT,
      media_type TEXT,
      is_deleted INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    )
  `)

  // 迁移：为已有 DB 补加实列
  const torrentCols = (db.prepare('PRAGMA table_info(torrents)').all() as any[]).map((c: any) => c.name)
  if (!torrentCols.includes('hash')) {
    db.exec(`ALTER TABLE torrents ADD COLUMN hash TEXT`)
    db.exec(`UPDATE torrents SET hash = json_extract(qb_torrent, '$.hash')`)
  }
  if (!torrentCols.includes('added_on')) {
    db.exec(`ALTER TABLE torrents ADD COLUMN added_on INTEGER`)
    db.exec(`UPDATE torrents SET added_on = json_extract(qb_torrent, '$.added_on')`)
  }

  const volumeCols = (db.prepare('PRAGMA table_info(volumes)').all() as any[]).map((c: any) => c.name)
  if (!volumeCols.includes('media_type')) {
    db.exec(`ALTER TABLE volumes ADD COLUMN media_type TEXT`)
  }

  // 索引 - torrents
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_torrents_hash ON torrents(hash)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_torrents_added_on ON torrents(added_on)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_torrents_name ON torrents((json_extract(qb_torrent, '$.name')))`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_torrents_state ON torrents((json_extract(qb_torrent, '$.state')))`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_torrents_category ON torrents((json_extract(qb_torrent, '$.category')))`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_torrents_deleted ON torrents(is_deleted)`)

  // 索引 - torrent_files
  db.exec(`CREATE INDEX IF NOT EXISTS idx_files_torrent_id ON torrent_files(torrent_id)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_files_deleted ON torrent_files(is_deleted)`)

  // 索引 - volumes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_volumes_torrent_id ON volumes(torrent_id)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_volumes_type ON volumes(type)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_volumes_catalog_no ON volumes(catalog_no)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_volumes_volume_name ON volumes(volume_name)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_volumes_deleted ON volumes(is_deleted)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_volumes_volume_no ON volumes(volume_no)`)

  console.log('SQLite initialized')
}

// 重新导出 schema 类型
export type { Torrent, TorrentFile, Volume, QueryCondition } from './schema'
