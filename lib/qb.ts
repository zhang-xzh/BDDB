import { QBittorrent } from '@ctrl/qbittorrent'
import { customAlphabet } from 'nanoid'
import { getDb } from '@/lib/db'

let qbClient: QBittorrent | null = null

export function getQbClient() {
  if (!qbClient) {
    const host = process.env.QB_HOST || 'localhost:18000'
    qbClient = new QBittorrent({
      baseUrl: host.startsWith('http') ? host : `http://${host}`,
    })
  }
  return qbClient
}

const now = () => Math.floor(Date.now() / 1000)

// ID 生成器 - 生成 16 字符随机 ID
const generateId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 16)

// 序列化辅助函数
function toDbTorrent(qbTorrentData: any): { qb_torrent: string; is_deleted: number; synced_at: number } {
  return {
    qb_torrent: JSON.stringify(qbTorrentData),
    is_deleted: 0,
    synced_at: now(),
  }
}

function toDbTorrentFile(qbFileData: any): { qb_torrent_file: string; is_deleted: number; synced_at: number } {
  return {
    qb_torrent_file: JSON.stringify(qbFileData),
    is_deleted: 0,
    synced_at: now(),
  }
}

export async function syncTorrentsFromQb() {
  const client = getQbClient()
  const db = getDb()

  try {
    const torrents = await client.listTorrents()
    const ts = now()

    // 一次性批量查出所有已有 hash → id 映射（直接读列，无需解析 JSON）
    const existingRows = db.prepare(
      `SELECT id, hash FROM torrents WHERE is_deleted = 0`
    ).all() as { id: string; hash: string }[]
    const existingMap = new Map(existingRows.map(r => [r.hash, r.id]))

    const newTorrents: { hash: string; data: string }[] = []
    const updateTorrents: { hash: string; data: string }[] = []

    for (const t of torrents) {
      const qbTorrentData = {
        hash: t.hash, name: t.name, size: t.size,
        progress: t.progress * 100, state: t.state,
        num_seeds: t.num_seeds, num_leechs: t.num_leechs,
        added_on: t.added_on, completion_on: t.completion_on,
        save_path: t.save_path, uploaded: t.uploaded, downloaded: t.downloaded,
        category: t.category || '',
      }
      const serialized = JSON.stringify(qbTorrentData)
      if (existingMap.has(t.hash)) {
        updateTorrents.push({ hash: t.hash, data: serialized })
      } else {
        newTorrents.push({ hash: t.hash, data: serialized })
      }
    }

    // 批量 INSERT 新 torrents，并记录 hash → rowid 以备文件插入
    const insertedIds = new Map<string, string>()
    if (newTorrents.length > 0) {
      const insertTorrent = db.prepare(
        `INSERT INTO torrents (id, hash, added_on, qb_torrent, is_deleted, synced_at) VALUES (?, ?, ?, ?, 0, ?)`
      )
      db.transaction(() => {
        for (const t of newTorrents) {
          const id = generateId()
          const addedOn = JSON.parse(t.data).added_on ?? null
          insertTorrent.run(id, t.hash, addedOn, t.data, ts)
          insertedIds.set(t.hash, id)
        }
      })()
    }

    // 批量 UPDATE 已有 torrents（一个事务），跳过数据未变化的行
    if (updateTorrents.length > 0) {
      const updateTorrent = db.prepare(
        `UPDATE torrents SET qb_torrent = ?, synced_at = ? WHERE hash = ? AND qb_torrent != ?`
      )
      db.transaction(() => {
        for (const t of updateTorrents) {
          updateTorrent.run(t.data, ts, t.hash, t.data)
        }
      })()
    }

    // 只为新 torrent 并发拉取文件列表（现有 torrent 的文件不在常规 sync 中重建）
    if (insertedIds.size > 0) {
      const fileResults = await Promise.allSettled(
        newTorrents.map(t => client.torrentFiles(t.hash).then(files => ({ hash: t.hash, files })))
      )

      const insertFile = db.prepare(
        `INSERT INTO torrent_files (id, torrent_id, qb_torrent_file, is_deleted, synced_at) VALUES (?, ?, ?, 0, ?)`
      )
      db.transaction(() => {
        for (const result of fileResults) {
          if (result.status !== 'fulfilled') continue
          const { hash, files } = result.value
          const torrentId = insertedIds.get(hash)
          if (!torrentId) continue
          for (const f of files) {
            insertFile.run(generateId(), torrentId, toDbTorrentFile(f).qb_torrent_file, ts)
          }
        }
      })()
    }

    console.log(`Sync: new=${newTorrents.length}, updated=${updateTorrents.length}`)
    return { success: true, newCount: newTorrents.length, updateCount: updateTorrents.length }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
