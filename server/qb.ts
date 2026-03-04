import { QBittorrent, type Torrent as QbTorrent, type TorrentFile as QbTorrentFile } from '@ctrl/qbittorrent'
import { addTorrent, updateTorrentStatus, torrentExists } from '#server/db/repository'
import type { Torrent } from '#server/db/schema'

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

export async function syncTorrentsFromQb() {
  const client = getQbClient()
  try {
    const torrents = await client.listTorrents()
    let newCount = 0, updateCount = 0

    for (const t of torrents) {
      const data = {
        hash: t.hash, name: t.name, size: t.size,
        progress: t.progress * 100, state: t.state,
        num_seeds: t.num_seeds, num_leechs: t.num_leechs,
        added_on: t.added_on, completion_on: t.completion_on,
        save_path: t.save_path, uploaded: t.uploaded, downloaded: t.downloaded,
      }

      const exists = await torrentExists(t.hash)
      if (!exists) {
        try {
          const files = await client.torrentFiles(t.hash)
          await addTorrent({ ...data, files, is_deleted: false } as Torrent)
        } catch {
          await addTorrent({ ...data, files: [], is_deleted: false } as Torrent)
        }
        newCount++
      } else {
        await updateTorrentStatus(t.hash, data)
        updateCount++
      }
    }
    console.log(`Sync: new=${newCount}, updated=${updateCount}`)
    return { success: true, newCount, updateCount }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
