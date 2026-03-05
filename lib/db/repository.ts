// SQLite repository 实现
import { getDb } from './index'
import type { Torrent, TorrentFile, Volume } from './schema'

const now = () => Math.floor(Date.now() / 1000)

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
    ...row,
    qb_torrent: JSON.parse(row.qb_torrent),
    is_deleted: !!row.is_deleted,
  } as Torrent
}

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

// ============================================================================
// Torrent CRUD
// ============================================================================

export async function torrentExists(hash: string): Promise<boolean> {
  const db = getDb()
  const stmt = db.prepare(`
    SELECT 1 FROM torrents 
    WHERE json_extract(qb_torrent, '$.hash') = ? AND is_deleted = 0
  `)
  const result = await stmt.get(hash)
  return !!result
}

export async function addTorrent(data: Partial<Torrent>): Promise<void> {
  const db = getDb()
  const hash = data.qb_torrent?.hash
  if (!hash) throw new Error('Torrent hash is required')

  const doc = {
    _id: data._id || `t_${hash}`,
    ...toDbTorrent(data),
  }

  const existing = db.prepare(`
    SELECT _id FROM torrents WHERE json_extract(qb_torrent, '$.hash') = ?
  `).get(hash)

  if (existing) {
    db.prepare(`
      UPDATE torrents SET qb_torrent = ?, is_deleted = ?, synced_at = ?
      WHERE json_extract(qb_torrent, '$.hash') = ?
    `).run(doc.qb_torrent, doc.is_deleted, doc.synced_at, hash)
  } else {
    db.prepare(`
      INSERT INTO torrents (_id, qb_torrent, is_deleted, synced_at)
      VALUES (?, ?, ?, ?)
    `).run(doc._id, doc.qb_torrent, doc.is_deleted, doc.synced_at)
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

  db.prepare(`
    UPDATE torrents SET ${updates.join(', ')}
    WHERE json_extract(qb_torrent, '$.hash') = ?
  `).run(...values)
}

export async function softDeleteTorrent(hash: string): Promise<void> {
  const db = getDb()
  db.prepare(`
    UPDATE torrents SET is_deleted = 1, synced_at = ?
    WHERE json_extract(qb_torrent, '$.hash') = ?
  `).run(now(), hash)
}

export async function getTorrent(hash: string): Promise<Torrent | null> {
  const db = getDb()
  const stmt = db.prepare(`
    SELECT * FROM torrents 
    WHERE json_extract(qb_torrent, '$.hash') = ?
  `)
  const row = await stmt.get(hash) as any
  if (!row) return null
  return fromDbTorrent(row)
}

export async function getTorrentById(id: string): Promise<Torrent | null> {
  const db = getDb()
  const stmt = db.prepare('SELECT * FROM torrents WHERE _id = ?')
  const row = await stmt.get(id) as any
  if (!row) return null
  return fromDbTorrent(row)
}

export async function getAllTorrents(includeDeleted = false): Promise<Torrent[]> {
  const db = getDb()
  const whereClause = includeDeleted ? '' : 'WHERE is_deleted = 0'
  const stmt = db.prepare(`
    SELECT * FROM torrents ${whereClause}
    ORDER BY json_extract(qb_torrent, '$.added_on') DESC
  `)
  const rows = await stmt.all() as any[]
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

export async function saveTorrentFiles(torrentId: string, files: Partial<TorrentFile>[]): Promise<void> {
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
      INSERT INTO torrent_files (_id, torrent_id, qb_torrent_file, is_deleted, synced_at)
      VALUES (?, ?, ?, ?, ?)
    `)

    for (const f of files) {
      const doc = {
        _id: f._id || `f_${torrentId}_${f.qb_torrent_file?.name || ''}`,
        torrent_id: torrentId,
        ...toDbTorrentFile(f),
      }
      insert.run(doc._id, doc.torrent_id, doc.qb_torrent_file, doc.is_deleted, doc.synced_at)
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

export async function getTorrentFile(fileId: string): Promise<TorrentFile | null> {
  const db = getDb()
  const stmt = db.prepare(`
    SELECT * FROM torrent_files WHERE _id = ?
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
    _id: data._id || `v_${Date.now()}`,
    torrent_id: data.torrent_id,
    torrent_file_ids: toDbVolumeFiles(data.torrent_file_ids),
    type: data.type || 'volume',
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
    INSERT INTO volumes (_id, torrent_id, torrent_file_ids, type, volume_no, sort_order,
      volume_name, catalog_no, suruga_id, note, title, release_date, maker,
      version_type, bonus_status, is_deleted, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    doc._id, doc.torrent_id, doc.torrent_file_ids, doc.type, doc.volume_no, doc.sort_order,
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
    UPDATE volumes SET ${updates.join(', ')} WHERE _id = ?
  `).run(...values)
}

export async function deleteVolume(id: string): Promise<void> {
  const db = getDb()
  db.prepare('DELETE FROM volumes WHERE _id = ?').run(id)
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
  const stmt = db.prepare('SELECT * FROM volumes WHERE _id = ?')
  const result = await stmt.get(id) as any
  if (!result) return null
  return fromDbVolume(result)
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
    torrent_id: torrentId,
    torrent_file_ids: toDbVolumeFiles(files),
    type: data.type || 'volume',
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
    updated_at: nowTs,
  }

  const existing = await db.prepare(`
    SELECT _id FROM volumes 
    WHERE torrent_id = ? AND volume_no = ?
  `).get(torrentId, data.volume_no) as any

  if (existing) {
    db.prepare(`
      UPDATE volumes SET 
        torrent_file_ids = ?, type = ?, sort_order = ?, volume_name = ?,
        catalog_no = ?, suruga_id = ?, note = ?, title = ?, release_date = ?,
        maker = ?, version_type = ?, bonus_status = ?, is_deleted = ?, updated_at = ?
      WHERE torrent_id = ? AND volume_no = ?
    `).run(
      doc.torrent_file_ids, doc.type, doc.sort_order, doc.volume_name,
      doc.catalog_no, doc.suruga_id, doc.note, doc.title, doc.release_date,
      doc.maker, doc.version_type, doc.bonus_status, doc.is_deleted, doc.updated_at,
      torrentId, data.volume_no
    )
  } else {
    const volId = `v_${torrentId}_${data.volume_no}`
    db.prepare(`
      INSERT INTO volumes (_id, torrent_id, torrent_file_ids, type, volume_no, sort_order,
        volume_name, catalog_no, suruga_id, note, title, release_date, maker,
        version_type, bonus_status, is_deleted, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      volId, doc.torrent_id, doc.torrent_file_ids, doc.type, doc.volume_no, doc.sort_order,
      doc.volume_name, doc.catalog_no, doc.suruga_id, doc.note, doc.title, doc.release_date,
      doc.maker, doc.version_type, doc.bonus_status, doc.is_deleted, nowTs, doc.updated_at
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
