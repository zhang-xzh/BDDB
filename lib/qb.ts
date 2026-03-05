import { QBittorrent } from '@ctrl/qbittorrent'
import { customAlphabet } from 'nanoid'
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

    // 第一步：同步所有 torrents（插入或更新），并收集文件数据
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
      const ts = now()

      if (!exists) {
        // 插入新 torrent
        db.prepare(`
          INSERT INTO torrents (qb_torrent, is_deleted, synced_at)
          VALUES (?, ?, ?)
        `).run(toDbTorrent(qbTorrentData).qb_torrent, 0, ts)

        // 获取刚插入的 id
        const inserted = await getTorrent(t.hash)
        const torrentId = inserted?.id

        if (torrentId) {
          try {
            const qbFiles = await client.torrentFiles(t.hash)
            // 插入文件
            const insertFile = db.prepare(`
              INSERT INTO torrent_files (id, torrent_id, qb_torrent_file, is_deleted, synced_at)
              VALUES (?, ?, ?, ?, ?)
            `)
            for (const f of qbFiles) {
              insertFile.run(
                generateId(),
                torrentId,
                toDbTorrentFile(f).qb_torrent_file,
                0,
                ts
              )
            }
          } catch (err) {
            console.warn(`Failed to get files for ${t.hash}:`, err)
          }
        }
        newCount++
      } else {
        // 更新现有 torrent
        db.prepare(`
          UPDATE torrents SET qb_torrent = ?, synced_at = ?
          WHERE json_extract(qb_torrent, '$.hash') = ?
        `).run(JSON.stringify(qbTorrentData), ts, t.hash)

        // 更新文件
        const torrent = await getTorrent(t.hash)
        const torrentId = torrent?.id
        if (torrentId) {
          try {
            const qbFiles = await client.torrentFiles(t.hash)
            const transaction = db.transaction(() => {
              db.prepare(`DELETE FROM torrent_files WHERE torrent_id = ?`).run(torrentId)
              const insertFile = db.prepare(`
                INSERT INTO torrent_files (id, torrent_id, qb_torrent_file, is_deleted, synced_at)
                VALUES (?, ?, ?, ?, ?)
              `)
              for (const f of qbFiles) {
                insertFile.run(
                  generateId(),
                  torrentId,
                  toDbTorrentFile(f).qb_torrent_file,
                  0,
                  ts
                )
              }
            })
            await transaction()
          } catch (err) {
            console.warn(`Failed to update files for ${t.hash}:`, err)
          }
        }
        updateCount++
      }
    }

    console.log(`Sync: new=${newCount}, updated=${updateCount}`)
    return { success: true, newCount, updateCount }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
