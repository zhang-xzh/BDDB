import { QBittorrent } from '@ctrl/qbittorrent'
import { getDb } from '@/lib/db'
import { getTorrent } from '@/lib/db/repository'
import type { Torrent, TorrentFile } from '@/lib/db'

let qbClient: QBittorrent | null = null

export function getQbClient() {
  if (!qbClient) {
    const host = process.env.QB_HOST || 'localhost:18000'
    qbClient = new QBittorrent({
      baseUrl: host.startsWith('http') ? host : `http://${host}`,
      username: process.env.QB_USER || '',
      password: process.env.QB_PASS || '',
    })
  }
  return qbClient
}

const now = () => Math.floor(Date.now() / 1000)

// 序列化辅助函数
function toDbTorrent(torrent: Partial<Torrent>): { qb_torrent: string; is_deleted: number; synced_at: number } {
  return {
    qb_torrent: JSON.stringify(torrent.qb_torrent),
    is_deleted: torrent.is_deleted ? 1 : 0,
    synced_at: torrent.synced_at ?? now(),
  }
}

function toDbTorrentFile(file: Partial<TorrentFile>): { qb_torrent_file: string; is_deleted: number; synced_at: number } {
  return {
    qb_torrent_file: JSON.stringify(file.qb_torrent_file),
    is_deleted: file.is_deleted ? 1 : 0,
    synced_at: file.synced_at ?? now(),
  }
}

// 快速检查 torrent 是否存在（使用同步 API）
function torrentExistsSync(hash: string): boolean {
  const db = getDb()
  const stmt = db.prepare(`
    SELECT 1 FROM torrents 
    WHERE json_extract(qb_torrent, '$.hash') = ? AND is_deleted = 0
  `)
  const result = stmt.get(hash)
  return !!result
}

export async function syncTorrentsFromQb() {
  const client = getQbClient()
  const db = getDb()
  
  try {
    const torrents = await client.listTorrents()
    let newCount = 0, updateCount = 0

    // 准备批量数据
    const insertTorrents: Array<{ _id: string; qb_torrent: any; is_deleted: number; synced_at: number }> = []
    const updateTorrents: Array<{ hash: string; qb_torrent: any }> = []
    const allFiles: Array<{ _id: string; torrent_id: string; qb_torrent_file: any; is_deleted: number; synced_at: number }> = []

    // 第一步：收集所有需要写入的数据
    for (const t of torrents) {
      const qbTorrentData = {
        hash: t.hash, name: t.name, size: t.size,
        progress: t.progress * 100, state: t.state,
        num_seeds: t.num_seeds, num_leechs: t.num_leechs,
        added_on: t.added_on, completion_on: t.completion_on,
        save_path: t.save_path, uploaded: t.uploaded, downloaded: t.downloaded,
        category: t.category || '',
      }

      const exists = torrentExistsSync(t.hash)
      if (!exists) {
        const torrentId = `t_${t.hash}`
        insertTorrents.push({
          _id: torrentId,
          ...toDbTorrent({ qb_torrent: qbTorrentData, is_deleted: false }),
        })

        try {
          const qbFiles = await client.torrentFiles(t.hash)
          const ts = now()
          for (const f of qbFiles) {
            allFiles.push({
              _id: `f_${torrentId}_${f.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50)}`,
              torrent_id: torrentId,
              ...toDbTorrentFile({ qb_torrent_file: f, is_deleted: false, synced_at: ts }),
            })
          }
        } catch (err) {
          console.warn(`Failed to get files for ${t.hash}:`, err)
        }
        newCount++
      } else {
        updateTorrents.push({ hash: t.hash, qb_torrent: qbTorrentData })
        updateCount++
      }
    }

    // 第二步：单个事务批量写入
    const transaction = db.transaction(() => {
      // 批量插入 torrents
      const insertTorrent = db.prepare(`
        INSERT OR REPLACE INTO torrents (_id, qb_torrent, is_deleted, synced_at)
        VALUES (?, ?, ?, ?)
      `)
      
      for (const t of insertTorrents) {
        insertTorrent.run(t._id, t.qb_torrent, t.is_deleted, t.synced_at)
      }

      // 批量更新 torrents
      const updateTorrent = db.prepare(`
        UPDATE torrents SET qb_torrent = ?, synced_at = ?
        WHERE json_extract(qb_torrent, '$.hash') = ?
      `)
      
      const ts = now()
      for (const t of updateTorrents) {
        updateTorrent.run(JSON.stringify(t.qb_torrent), ts, t.hash)
      }

      // 批量插入 files（先删除旧的）
      const deleteFiles = db.prepare(`DELETE FROM torrent_files WHERE torrent_id = ?`)
      const insertFile = db.prepare(`
        INSERT INTO torrent_files (_id, torrent_id, qb_torrent_file, is_deleted, synced_at)
        VALUES (?, ?, ?, ?, ?)
      `)

      // 按 torrent_id 分组处理
      const filesByTorrent = new Map<string, typeof allFiles>()
      for (const f of allFiles) {
        if (!filesByTorrent.has(f.torrent_id)) {
          filesByTorrent.set(f.torrent_id, [])
        }
        filesByTorrent.get(f.torrent_id)!.push(f)
      }

      for (const [torrentId, files] of filesByTorrent) {
        deleteFiles.run(torrentId)
        for (const f of files) {
          insertFile.run(f._id, f.torrent_id, f.qb_torrent_file, f.is_deleted, f.synced_at)
        }
      }
    })

    await transaction()
    
    console.log(`Sync: new=${newCount}, updated=${updateCount}, files=${allFiles.length}`)
    return { success: true, newCount, updateCount }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
