// 数据库模块 - 使用 better-sqlite3
import Database from 'better-sqlite3'
import { join } from 'path'

const DATABASE_PATH = join(process.cwd(), 'bddb.sqlite')

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DATABASE_PATH)
    db.pragma('journal_mode = WAL')
  }
  return db
}

export function initDb() {
  const database = getDb()

  // 种子表
  database.exec(`
    CREATE TABLE IF NOT EXISTS torrents (
      hash TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      size INTEGER DEFAULT 0,
      progress REAL DEFAULT 0,
      state TEXT DEFAULT '',
      num_seeds INTEGER DEFAULT 0,
      num_leechs INTEGER DEFAULT 0,
      added_on INTEGER DEFAULT 0,
      completion_on INTEGER DEFAULT 0,
      save_path TEXT DEFAULT '',
      uploaded REAL DEFAULT 0,
      downloaded REAL DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      torrent_type TEXT DEFAULT 'single',
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `)

  // 文件表
  database.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      torrent_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      size INTEGER DEFAULT 0,
      progress REAL DEFAULT 0,
      file_index INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (torrent_hash) REFERENCES torrents(hash) ON DELETE CASCADE,
      UNIQUE(torrent_hash, name)
    )
  `)

  // 合集成员表
  database.exec(`
    CREATE TABLE IF NOT EXISTS box_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      box_hash TEXT NOT NULL,
      member_hash TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (box_hash) REFERENCES torrents(hash) ON DELETE CASCADE,
      FOREIGN KEY (member_hash) REFERENCES torrents(hash) ON DELETE CASCADE,
      UNIQUE(box_hash, member_hash)
    )
  `)

  // 光盘表
  database.exec(`
    CREATE TABLE IF NOT EXISTS discs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      torrent_hash TEXT NOT NULL,
      root_path TEXT NOT NULL,
      disc_type TEXT DEFAULT 'volume',
      catalog_no TEXT DEFAULT '',
      catalog_maker TEXT DEFAULT '',
      maker TEXT DEFAULT '',
      release_date TEXT DEFAULT '',
      version_type TEXT DEFAULT '',
      bonus_status TEXT DEFAULT '',
      suruga_id TEXT DEFAULT '',
      volume_no INTEGER DEFAULT 0,
      disc_no INTEGER DEFAULT 0,
      note TEXT DEFAULT '',
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (torrent_hash) REFERENCES torrents(hash) ON DELETE CASCADE
    )
  `)

  // BD 信息表
  database.exec(`
    CREATE TABLE IF NOT EXISTS bd_info (
      torrent_hash TEXT PRIMARY KEY,
      catalog_no TEXT DEFAULT '',
      catalog_maker TEXT DEFAULT '',
      maker TEXT DEFAULT '',
      release_date TEXT DEFAULT '',
      model_no TEXT DEFAULT '',
      version_type TEXT DEFAULT '',
      bonus_status TEXT DEFAULT '',
      suruga_id TEXT DEFAULT '',
      note TEXT DEFAULT '',
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (torrent_hash) REFERENCES torrents(hash) ON DELETE CASCADE
    )
  `)

  // 配置表
  database.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `)

  // 创建索引
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_torrents_state ON torrents(state)
  `)
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_torrents_deleted ON torrents(is_deleted)
  `)
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_files_hash ON files(torrent_hash)
  `)
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_box_members_box ON box_members(box_hash)
  `)

  console.log('Database initialized')
}

// ============ 种子操作 ============
export function torrentExists(hash: string): boolean {
  const db = getDb()
  const stmt = db.prepare('SELECT 1 FROM torrents WHERE hash = ?')
  const result = stmt.get(hash)
  return result !== undefined
}

export function addTorrent(data: Record<string, any>) {
  const db = getDb()
  const now = Math.floor(Date.now() / 1000)
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO torrents
    (hash, name, size, progress, state, num_seeds, num_leechs, added_on,
     completion_on, save_path, uploaded, downloaded, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  stmt.run(
    data.hash, data.name, data.size ?? 0, data.progress ?? 0, data.state ?? '',
    data.num_seeds ?? 0, data.num_leechs ?? 0, data.added_on ?? 0,
    data.completion_on ?? 0, data.save_path ?? '', data.uploaded ?? 0,
    data.downloaded ?? 0, now
  )
}

export function updateTorrentStatus(hash: string, data: Record<string, any>) {
  const db = getDb()
  const now = Math.floor(Date.now() / 1000)
  const stmt = db.prepare(`
    UPDATE torrents SET
    progress = ?, state = ?, num_seeds = ?, num_leechs = ?,
    uploaded = ?, downloaded = ?, updated_at = ?
    WHERE hash = ?
  `)
  stmt.run(
    data.progress ?? 0, data.state ?? '', data.num_seeds ?? 0, data.num_leechs ?? 0,
    data.uploaded ?? 0, data.downloaded ?? 0, now, hash
  )
}

export function softDeleteTorrent(hash: string) {
  const db = getDb()
  const now = Math.floor(Date.now() / 1000)
  const stmt = db.prepare('UPDATE torrents SET is_deleted = 1, updated_at = ? WHERE hash = ?')
  stmt.run(now, hash)
}

export function getTorrent(hash: string): Record<string, any> | null {
  const db = getDb()
  const stmt = db.prepare('SELECT * FROM torrents WHERE hash = ?')
  return stmt.get(hash) as Record<string, any> | null
}

export function getAllTorrents(includeDeleted = false): Record<string, any>[] {
  const db = getDb()
  const query = includeDeleted
    ? 'SELECT * FROM torrents ORDER BY added_on DESC'
    : 'SELECT * FROM torrents WHERE is_deleted = 0 ORDER BY added_on DESC'
  const stmt = db.prepare(query)
  return stmt.all() as Record<string, any>[]
}

export function setTorrentType(hash: string, torrentType: string) {
  const db = getDb()
  const now = Math.floor(Date.now() / 1000)
  const stmt = db.prepare('UPDATE torrents SET torrent_type = ?, updated_at = ? WHERE hash = ?')
  stmt.run(torrentType, now, hash)
}

// ============ 文件操作 ============
export function addFiles(hash: string, files: Record<string, any>[]) {
  const db = getDb()
  const now = Math.floor(Date.now() / 1000)
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO files
    (torrent_hash, name, size, progress, file_index, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  
  const insertMany = db.transaction((files: Record<string, any>[]) => {
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      stmt.run(hash, f.name ?? '', f.size ?? 0, f.progress ?? 0, i, now)
    }
  })
  
  insertMany(files)
}

export function getFiles(hash: string): Record<string, any>[] {
  const db = getDb()
  const stmt = db.prepare('SELECT * FROM files WHERE torrent_hash = ? ORDER BY file_index')
  return stmt.all(hash) as Record<string, any>[]
}

// ============ 合集成员操作 ============
export function addBoxMember(boxHash: string, memberHash: string, sortOrder = 0) {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO box_members (box_hash, member_hash, sort_order)
    VALUES (?, ?, ?)
  `)
  stmt.run(boxHash, memberHash, sortOrder)
}

export function removeBoxMember(boxHash: string, memberHash: string) {
  const db = getDb()
  const stmt = db.prepare('DELETE FROM box_members WHERE box_hash = ? AND member_hash = ?')
  stmt.run(boxHash, memberHash)
}

export function getBoxMembers(boxHash: string): string[] {
  const db = getDb()
  const stmt = db.prepare('SELECT member_hash FROM box_members WHERE box_hash = ? ORDER BY sort_order')
  const rows = stmt.all(boxHash) as Array<{ member_hash: string }>
  return rows.map(row => row.member_hash)
}

// ============ 光盘操作 ============
export function addDisc(discData: Record<string, any>) {
  const db = getDb()
  const now = Math.floor(Date.now() / 1000)
  const stmt = db.prepare(`
    INSERT INTO discs
    (torrent_hash, root_path, disc_type, catalog_no, catalog_maker,
     maker, release_date, version_type, bonus_status, suruga_id,
     volume_no, disc_no, note, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  stmt.run(
    discData.torrent_hash,
    discData.root_path,
    discData.disc_type ?? 'volume',
    discData.catalog_no ?? '',
    discData.catalog_maker ?? '',
    discData.maker ?? '',
    discData.release_date ?? '',
    discData.version_type ?? '',
    discData.bonus_status ?? '',
    discData.suruga_id ?? '',
    discData.volume_no ?? 0,
    discData.disc_no ?? 0,
    discData.note ?? '',
    now
  )
}

export function getDiscsByTorrent(hash: string): Record<string, any>[] {
  const db = getDb()
  const stmt = db.prepare('SELECT * FROM discs WHERE torrent_hash = ? ORDER BY volume_no, disc_no')
  return stmt.all(hash) as Record<string, any>[]
}

export function getDiscById(discId: number): Record<string, any> | null {
  const db = getDb()
  const stmt = db.prepare('SELECT * FROM discs WHERE id = ?')
  return stmt.get(discId) as Record<string, any> | null
}

export function updateDisc(discId: number, discData: Record<string, any>) {
  const db = getDb()
  const now = Math.floor(Date.now() / 1000)
  const stmt = db.prepare(`
    UPDATE discs SET
    catalog_no = ?, catalog_maker = ?, maker = ?,
    release_date = ?, version_type = ?, bonus_status = ?,
    suruga_id = ?, volume_no = ?, disc_no = ?, note = ?, updated_at = ?
    WHERE id = ?
  `)
  stmt.run(
    discData.catalog_no ?? '',
    discData.catalog_maker ?? '',
    discData.maker ?? '',
    discData.release_date ?? '',
    discData.version_type ?? '',
    discData.bonus_status ?? '',
    discData.suruga_id ?? '',
    discData.volume_no ?? 0,
    discData.disc_no ?? 0,
    discData.note ?? '',
    now,
    discId
  )
}

export function deleteDisc(discId: number) {
  const db = getDb()
  const stmt = db.prepare('DELETE FROM discs WHERE id = ?')
  stmt.run(discId)
}

export function getAllDiscs(): Record<string, any>[] {
  const db = getDb()
  const stmt = db.prepare('SELECT * FROM discs ORDER BY created_at DESC')
  return stmt.all() as Record<string, any>[]
}

// ============ BD 信息操作 ============
export function saveBdInfo(hash: string, bdData: Record<string, any>) {
  const db = getDb()
  const now = Math.floor(Date.now() / 1000)
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO bd_info
    (torrent_hash, catalog_no, catalog_maker, maker, release_date, model_no,
     version_type, bonus_status, suruga_id, note, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  stmt.run(
    hash,
    bdData.catalogNo ?? '',
    bdData.catalogMaker ?? '',
    bdData.maker ?? '',
    bdData.releaseDate ?? '',
    bdData.modelNo ?? '',
    bdData.versionType ?? '',
    bdData.bonusStatus ?? '',
    bdData.surugaId ?? '',
    bdData.note ?? '',
    now
  )
}

export function getBdInfo(hash: string): Record<string, any> | null {
  const db = getDb()
  const stmt = db.prepare('SELECT * FROM bd_info WHERE torrent_hash = ?')
  return stmt.get(hash) as Record<string, any> | null
}

// ============ 配置操作 ============
export function saveConfig(key: string, value: string) {
  const db = getDb()
  const now = Math.floor(Date.now() / 1000)
  const stmt = db.prepare('INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, ?)')
  stmt.run(key, value, now)
}

export function getConfig(key: string): string | null {
  const db = getDb()
  const stmt = db.prepare('SELECT value FROM config WHERE key = ?')
  const row = stmt.get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function getAllConfig(): Record<string, string> {
  const db = getDb()
  const stmt = db.prepare('SELECT key, value FROM config')
  const rows = stmt.all() as Array<{ key: string; value: string }>
  return Object.fromEntries(rows.map(row => [row.key, row.value]))
}

// ============ 统计 ============
export function getStats(): Record<string, number> {
  const db = getDb()
  
  const totalStmt = db.prepare('SELECT COUNT(*) as count FROM torrents WHERE is_deleted = 0')
  const downloadingStmt = db.prepare('SELECT COUNT(*) as count FROM torrents WHERE state = "downloading" AND is_deleted = 0')
  const seedingStmt = db.prepare('SELECT COUNT(*) as count FROM torrents WHERE state = "uploading" AND is_deleted = 0')
  const pausedStmt = db.prepare('SELECT COUNT(*) as count FROM torrents WHERE state LIKE "%paused%" AND is_deleted = 0')
  const totalSizeStmt = db.prepare('SELECT COALESCE(SUM(size), 0) as total FROM torrents WHERE is_deleted = 0')
  
  return {
    total: (totalStmt.get() as { count: number }).count,
    downloading: (downloadingStmt.get() as { count: number }).count,
    seeding: (seedingStmt.get() as { count: number }).count,
    paused: (pausedStmt.get() as { count: number }).count,
    total_size: (totalSizeStmt.get() as { total: number }).total,
  }
}
