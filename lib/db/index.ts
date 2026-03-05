// SQLite 数据库连接模块（持久化存储）
import Database from 'better-sqlite3'
import path from 'path'

const DATA_PATH = path.join(process.cwd(), 'data')
let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(path.join(DATA_PATH, 'bddb.sqlite'), {
      verbose: process.env.NODE_ENV === 'development' ? console.log : null,
    })
    // 开启 WAL 模式提升并发性能
    db.pragma('journal_mode = WAL')
    // 优化写入性能：NORMAL 比 FULL 快，比 OFF 安全
    db.pragma('synchronous = NORMAL')
    // 设置缓存大小（-64000 = 64MB）
    db.pragma('cache_size = -64000')
    // 开启内存映射提升大文件读取（256MB）
    db.pragma('mmap_size = 268435456')
    // 开启外键约束
    db.pragma('foreign_keys = ON')
    // 临时存储使用内存
    db.pragma('temp_store = MEMORY')
  }
  return db
}

export function initDb() {
  const db = getDb()

  // 创建 torrents 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS torrents (
      _id TEXT PRIMARY KEY,
      qb_torrent TEXT NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      synced_at INTEGER
    )
  `)

  // 创建 torrent_files 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS torrent_files (
      _id TEXT PRIMARY KEY,
      torrent_id TEXT NOT NULL,
      qb_torrent_file TEXT NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      synced_at INTEGER
    )
  `)

  // 创建 volumes 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS volumes (
      _id TEXT PRIMARY KEY,
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
      is_deleted INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    )
  `)

  // 创建索引 - torrents
  db.exec(`CREATE INDEX IF NOT EXISTS idx_torrents_hash ON torrents((json_extract(qb_torrent, '$.hash')))`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_torrents_name ON torrents((json_extract(qb_torrent, '$.name')))`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_torrents_state ON torrents((json_extract(qb_torrent, '$.state')))`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_torrents_category ON torrents((json_extract(qb_torrent, '$.category')))`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_torrents_deleted ON torrents(is_deleted)`);

  // 创建索引 - torrent_files
  db.exec(`CREATE INDEX IF NOT EXISTS idx_files_torrent_id ON torrent_files(torrent_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_files_deleted ON torrent_files(is_deleted)`);

  // 创建索引 - volumes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_volumes_torrent_id ON volumes(torrent_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_volumes_type ON volumes(type)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_volumes_catalog_no ON volumes(catalog_no)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_volumes_volume_name ON volumes(volume_name)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_volumes_deleted ON volumes(is_deleted)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_volumes_volume_no ON volumes(volume_no)`);

  console.log('SQLite initialized')
}

// 重新导出 schema 类型
export type { Torrent, TorrentFile, Volume, QueryCondition } from './schema'
