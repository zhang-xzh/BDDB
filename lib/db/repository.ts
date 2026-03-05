// SQLite repository 实现
import { customAlphabet } from 'nanoid'
import { getDb } from './index'
import type { Torrent, TorrentFile, Volume } from './schema'

const now = () => Math.floor(Date.now() / 1000)

// ID 生成器 - 生成 16 字符随机 ID
const generateId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 16)

// ============================================================================
// 数据转换工具 (Serialization Helpers)
// ============================================================================

function toDbTorrent(torrent: Partial<Torrent>): { qb_torrent: string; is_deleted: number; synced_at: number } {
  return {
    qb_torrent: JSON.stringify(torrent.qb_torrent),
    is_deleted: torrent.is_deleted ? 1 : 0,
    synced_at: torrent.synced_at ?? now(),
  }
}

function fromDbTorrent(row: any): Torrent {
  return {
    id: row.id,
    qb_torrent: JSON.parse(row.qb_torrent),
    is_deleted: !!row.is_deleted,
    synced_at: row.synced_at,
  } as Torrent
}

function toDbTorrentFile(file: any): { qb_torrent_file: string; is_deleted: number; synced_at: number } {
  return {
    qb_torrent_file: JSON.stringify(file.qb_torrent_file || file),
    is_deleted: file.is_deleted ? 1 : 0,
    synced_at: file.synced_at ?? now(),
  }
}

function fromDbTorrentFile(row: any): TorrentFile {
  return {
    id: row.id,
    qb_torrent_file: JSON.parse(row.qb_torrent_file),
    torrent_id: row.torrent_id,
    is_deleted: !!row.is_deleted,
    synced_at: row.synced_at,
  } as TorrentFile
}

function torrentFileToFileItem(torrentFile: TorrentFile): any {
  const qbFile = torrentFile.qb_torrent_file
  return {
    id: torrentFile.id,
    name: qbFile.name,
    size: qbFile.size,
    progress: qbFile.progress || 0,
  }
}

function toDbVolumeFiles(fileIds: string[]): string {
  return JSON.stringify(fileIds)
}

function fromDbVolumeFiles(jsonStr: string): string[] {
  return JSON.parse(jsonStr)
}

function fromDbVolume(row: any): Volume {
  return {
    id: row.id,
    torrent_id: row.torrent_id,
    torrent_file_ids: fromDbVolumeFiles(row.torrent_file_ids),
    type: row.type,
    volume_no: row.volume_no,
    sort_order: row.sort_order,
    volume_name: row.volume_name,
    catalog_no: row.catalog_no,
    suruga_id: row.suruga_id,
    note: row.note,
    title: row.title,
    release_date: row.release_date,
    maker: row.maker,
    version_type: row.version_type,
    bonus_status: row.bonus_status,
    media_type: row.media_type,
    is_deleted: !!row.is_deleted,
    created_at: row.created_at,
    updated_at: row.updated_at,
  } as Volume
}

// ============================================================================
// Torrent CRUD
// ============================================================================

export async function torrentExists(hash: string): Promise<boolean> {
  const db = getDb()
  const result = db.prepare(`SELECT 1 FROM torrents WHERE hash = ? AND is_deleted = 0`).get(hash)
  return !!result
}

export async function addTorrent(data: Partial<Torrent>): Promise<void> {
  const db = getDb()
  const hash = data.qb_torrent?.hash
  if (!hash) throw new Error('Torrent hash is required')

  const doc = toDbTorrent(data)
  const addedOn = data.qb_torrent?.added_on ?? null

  const existing = db.prepare(`SELECT id FROM torrents WHERE hash = ?`).get(hash) as any

  if (existing) {
    if (!existing.id) {
      db.prepare(`UPDATE torrents SET id = ?, qb_torrent = ?, is_deleted = ?, synced_at = ? WHERE hash = ?`)
        .run(generateId(), doc.qb_torrent, doc.is_deleted, doc.synced_at, hash)
    } else {
      db.prepare(`UPDATE torrents SET qb_torrent = ?, is_deleted = ?, synced_at = ? WHERE hash = ?`)
        .run(doc.qb_torrent, doc.is_deleted, doc.synced_at, hash)
    }
  } else {
    db.prepare(`INSERT INTO torrents (id, hash, added_on, qb_torrent, is_deleted, synced_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(generateId(), hash, addedOn, doc.qb_torrent, doc.is_deleted, doc.synced_at)
  }
}

export async function updateTorrentStatus(hash: string, data: Partial<Torrent>): Promise<void> {
  const db = getDb()
  const updates: string[] = []
  const values: any[] = []

  if (data.is_deleted !== undefined) {
    updates.push('is_deleted = ?')
    values.push(data.is_deleted ? 1 : 0)
  }
  if (data.qb_torrent) {
    updates.push('qb_torrent = ?')
    values.push(JSON.stringify(data.qb_torrent))
  }
  updates.push('synced_at = ?')
  values.push(now())
  values.push(hash)

  db.prepare(`UPDATE torrents SET ${updates.join(', ')} WHERE hash = ?`).run(...values)
}

export async function softDeleteTorrent(hash: string): Promise<void> {
  const db = getDb()
  db.prepare(`UPDATE torrents SET is_deleted = 1, synced_at = ? WHERE hash = ?`).run(now(), hash)
}

export async function getTorrent(hash: string): Promise<Torrent | null> {
  const db = getDb()
  const row = db.prepare(`SELECT * FROM torrents WHERE hash = ?`).get(hash) as any
  if (!row) return null
  return fromDbTorrent(row)
}

export async function getTorrentById(id: string): Promise<Torrent | null> {
  const db = getDb()
  const stmt = db.prepare('SELECT * FROM torrents WHERE id = ?')
  const row = await stmt.get(id) as any
  if (!row) return null
  return fromDbTorrent(row)
}

export async function getAllTorrents(includeDeleted = false): Promise<Torrent[]> {
  const db = getDb()
  const whereClause = includeDeleted ? '' : 'WHERE is_deleted = 0'
  const rows = db.prepare(`
    SELECT * FROM torrents ${whereClause}
    ORDER BY added_on DESC
  `).all() as any[]
  return rows.map(fromDbTorrent)
}

export async function searchTorrents(keyword: string): Promise<Torrent[]> {
  const db = getDb()
  const stmt = db.prepare(`
    SELECT * FROM torrents 
    WHERE is_deleted = 0 AND json_extract(qb_torrent, '$.name') LIKE ?
    ORDER BY json_extract(qb_torrent, '$.added_on') DESC
  `)
  const rows = await stmt.all(`%${keyword}%`) as any[]
  return rows.map(fromDbTorrent)
}

export async function getTorrentsByState(state: string): Promise<Torrent[]> {
  const db = getDb()
  const stmt = db.prepare(`
    SELECT * FROM torrents 
    WHERE is_deleted = 0 AND json_extract(qb_torrent, '$.state') = ?
    ORDER BY json_extract(qb_torrent, '$.added_on') DESC
  `)
  const rows = await stmt.all(state) as any[]
  return rows.map(fromDbTorrent)
}

export async function getTorrentsByCategory(category: string): Promise<Torrent[]> {
  const db = getDb()
  const stmt = db.prepare(`
    SELECT * FROM torrents 
    WHERE is_deleted = 0 AND json_extract(qb_torrent, '$.category') = ?
    ORDER BY json_extract(qb_torrent, '$.added_on') DESC
  `)
  const rows = await stmt.all(category) as any[]
  return rows.map(fromDbTorrent)
}

// ============================================================================
// TorrentFile CRUD
// ============================================================================

export async function saveTorrentFiles(torrentId: string, files: any[]): Promise<void> {
  const db = getDb()
  const nowTs = now()

  const transaction = db.transaction(() => {
    // 先删除旧文件
    db.prepare(`
      DELETE FROM torrent_files WHERE torrent_id = ?
    `).run(torrentId)

    if (files.length === 0) return

    // 插入新文件
    const insert = db.prepare(`
      INSERT INTO torrent_files (id, torrent_id, qb_torrent_file, is_deleted, synced_at)
      VALUES (?, ?, ?, ?, ?)
    `)

    for (const f of files) {
      const doc = {
        id: generateId(),
        torrent_id: torrentId,
        ...toDbTorrentFile(f),
      }
      insert.run(doc.id, doc.torrent_id, doc.qb_torrent_file, doc.is_deleted, doc.synced_at)
    }
  })

  await transaction()
}

export async function getTorrentFiles(torrentId: string): Promise<TorrentFile[]> {
  const db = getDb()
  const stmt = db.prepare(`
    SELECT * FROM torrent_files
    WHERE torrent_id = ? AND is_deleted = 0
    ORDER BY json_extract(qb_torrent_file, '$.name') ASC
  `)
  const rows = await stmt.all(torrentId) as any[]
  return rows.map(fromDbTorrentFile)
}

export async function getTorrentFilesAsFileItems(torrentId: string): Promise<any[]> {
  const files = await getTorrentFiles(torrentId)
  return files.map(torrentFileToFileItem)
}

export async function getTorrentFile(fileId: string): Promise<TorrentFile | null> {
  const db = getDb()
  const stmt = db.prepare(`
    SELECT * FROM torrent_files WHERE id = ?
  `)
  const row = await stmt.get(fileId) as any
  if (!row) return null
  return fromDbTorrentFile(row)
}

export async function softDeleteTorrentFiles(torrentId: string): Promise<void> {
  const db = getDb()
  db.prepare(`
    UPDATE torrent_files SET is_deleted = 1, synced_at = ?
    WHERE torrent_id = ?
  `).run(now(), torrentId)
}

// ============================================================================
// Volume CRUD
// ============================================================================

export async function addVolume(data: Partial<Volume>): Promise<void> {
  const db = getDb()
  const doc = {
    id: generateId(),
    torrent_id: data.torrent_id,
    torrent_file_ids: toDbVolumeFiles(data.torrent_file_ids || []),
    type: data.type ?? null,
    volume_no: data.volume_no || 0,
    sort_order: data.sort_order || 0,
    volume_name: data.volume_name || '',
    catalog_no: data.catalog_no || '',
    suruga_id: data.suruga_id || '',
    note: data.note || '',
    title: data.title || '',
    release_date: data.release_date || '',
    maker: data.maker || '',
    version_type: data.version_type || '',
    bonus_status: data.bonus_status || '',
    is_deleted: 0,
    created_at: now(),
    updated_at: now(),
  }

  db.prepare(`
    INSERT INTO volumes (id, torrent_id, torrent_file_ids, type, volume_no, sort_order,
      volume_name, catalog_no, suruga_id, note, title, release_date, maker,
      version_type, bonus_status, is_deleted, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    doc.id, doc.torrent_id, doc.torrent_file_ids, doc.type, doc.volume_no, doc.sort_order,
    doc.volume_name, doc.catalog_no, doc.suruga_id, doc.note, doc.title, doc.release_date,
    doc.maker, doc.version_type, doc.bonus_status, doc.is_deleted, doc.created_at, doc.updated_at
  )
}

export async function updateVolume(id: string, data: Partial<Volume>): Promise<void> {
  const db = getDb()
  const updates: string[] = []
  const values: any[] = []

  const fields = ['torrent_id', 'torrent_file_ids', 'type', 'volume_no', 'sort_order',
    'volume_name', 'catalog_no', 'suruga_id', 'note', 'title', 'release_date',
    'maker', 'version_type', 'bonus_status', 'is_deleted']

  for (const field of fields) {
    if (data[field as keyof Volume] !== undefined) {
      updates.push(`${field} = ?`)
      if (field === 'torrent_file_ids') {
        values.push(toDbVolumeFiles(data[field as keyof Volume] as string[]))
      } else {
        values.push(data[field as keyof Volume])
      }
    }
  }

  updates.push('updated_at = ?')
  values.push(now())
  values.push(id)

  db.prepare(`
    UPDATE volumes SET ${updates.join(', ')} WHERE id = ?
  `).run(...values)
}

export async function deleteVolume(id: string): Promise<void> {
  const db = getDb()
  db.prepare('DELETE FROM volumes WHERE id = ?').run(id)
}

export async function deleteVolumesByTorrent(torrentId: string): Promise<void> {
  const db = getDb()
  db.prepare('DELETE FROM volumes WHERE torrent_id = ?').run(torrentId)
}

export async function getVolumesByTorrent(torrentId: string): Promise<Volume[]> {
  const db = getDb()
  const stmt = db.prepare(`
    SELECT * FROM volumes
    WHERE torrent_id = ? AND is_deleted = 0
    ORDER BY volume_no ASC, sort_order ASC
  `)
  const rows = await stmt.all(torrentId) as any[]
  return rows.map(fromDbVolume)
}

export async function getVolumesByFile(fileId: string): Promise<Volume[]> {
  const db = getDb()
  const stmt = db.prepare(`
    SELECT * FROM volumes
    WHERE is_deleted = 0 AND torrent_file_ids LIKE ?
    ORDER BY volume_no ASC, sort_order ASC
  `)
  // 使用 LIKE 匹配 JSON 数组中的元素
  const rows = await stmt.all(`%"${fileId}"%`) as any[]
  return rows.map(fromDbVolume)
}

export async function getVolumeById(id: string): Promise<Volume | null> {
  const db = getDb()
  const stmt = db.prepare('SELECT * FROM volumes WHERE id = ?')
  const result = await stmt.get(id) as any
  if (!result) return null
  return fromDbVolume(result)
}

export function getVolumeCounts(): Map<string, number> {
  const db = getDb()
  const rows = db.prepare(`
    SELECT torrent_id, COUNT(*) as cnt FROM volumes WHERE is_deleted = 0 GROUP BY torrent_id
  `).all() as { torrent_id: string; cnt: number }[]
  return new Map(rows.map(r => [r.torrent_id, r.cnt]))
}

export async function getAllVolumes(): Promise<Volume[]> {
  const db = getDb()
  const stmt = db.prepare(`
    SELECT * FROM volumes 
    WHERE is_deleted = 0
    ORDER BY created_at DESC
  `)
  const rows = await stmt.all() as any[]
  return rows.map(fromDbVolume)
}

export async function getVolumesByType(type: 'volume' | 'box'): Promise<Volume[]> {
  const db = getDb()
  const stmt = db.prepare(`
    SELECT * FROM volumes 
    WHERE type = ? AND is_deleted = 0
    ORDER BY volume_no ASC
  `)
  const rows = await stmt.all(type) as any[]
  return rows.map(fromDbVolume)
}

export async function saveVolume(torrentId: string, files: string[], data: Partial<Volume>): Promise<void> {
  const db = getDb()
  const nowTs = now()

  const doc = {
    id: generateId(),
    torrent_id: torrentId,
    torrent_file_ids: toDbVolumeFiles(files),
    type: data.type ?? null,
    volume_no: data.volume_no || 0,
    sort_order: data.sort_order || 0,
    volume_name: data.volume_name || '',
    catalog_no: data.catalog_no || '',
    suruga_id: data.suruga_id || '',
    note: data.note || '',
    title: data.title || '',
    release_date: data.release_date || '',
    maker: data.maker || '',
    version_type: data.version_type || '',
    bonus_status: data.bonus_status || '',
    media_type: data.media_type || null,
    is_deleted: 0,
    updated_at: nowTs,
  }

  const existing = await db.prepare(`
    SELECT id FROM volumes
    WHERE torrent_id = ? AND volume_no = ?
  `).get(torrentId, data.volume_no) as any

  if (existing) {
    db.prepare(`
      UPDATE volumes SET
        torrent_file_ids = ?, type = ?, sort_order = ?, volume_name = ?,
        catalog_no = ?, suruga_id = ?, note = ?, title = ?, release_date = ?,
        maker = ?, version_type = ?, bonus_status = ?, media_type = ?, is_deleted = ?, updated_at = ?
      WHERE torrent_id = ? AND volume_no = ?
    `).run(
      doc.torrent_file_ids, doc.type, doc.sort_order, doc.volume_name,
      doc.catalog_no, doc.suruga_id, doc.note, doc.title, doc.release_date,
      doc.maker, doc.version_type, doc.bonus_status, doc.media_type, doc.is_deleted, doc.updated_at,
      torrentId, data.volume_no
    )
  } else {
    db.prepare(`
      INSERT INTO volumes (id, torrent_id, torrent_file_ids, type, volume_no, sort_order,
        volume_name, catalog_no, suruga_id, note, title, release_date, maker,
        version_type, bonus_status, media_type, is_deleted, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      doc.id, doc.torrent_id, doc.torrent_file_ids, doc.type, doc.volume_no, doc.sort_order,
      doc.volume_name, doc.catalog_no, doc.suruga_id, doc.note, doc.title, doc.release_date,
      doc.maker, doc.version_type, doc.bonus_status, doc.media_type, doc.is_deleted, nowTs, doc.updated_at
    )
  }
}

// ============================================================================
// Utility
// ============================================================================

export async function clearAllData(): Promise<void> {
  const db = getDb()
  const transaction = db.transaction(() => {
    db.exec('DELETE FROM torrent_files')
    db.exec('DELETE FROM volumes')
    db.exec('DELETE FROM torrents')
  })
  await transaction()
}
