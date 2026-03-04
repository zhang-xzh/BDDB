// qBittorrent 客户端模块
import { QBittorrent } from '@ctrl/qbittorrent'

let qbClient: QBittorrent | null = null

export function getQbClient() {
  if (!qbClient) {
    const host = process.env.QB_HOST || 'localhost:18000'
    const username = process.env.QB_USER || ''
    const password = process.env.QB_PASS || ''

    qbClient = new QBittorrent({
      baseUrl: host.startsWith('http') ? host : `http://${host}`,
      username,
      password,
    })
  }
  return qbClient
}

export async function testQbConnection() {
  try {
    const client = getQbClient()
    const version = await client.getAppVersion()
    return { success: true, version }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function syncTorrentsFromQb() {
  const client = getQbClient()
  const { addTorrent, updateTorrentStatus, torrentExists, addFiles } = await import('./db')

  try {
    const torrents = await client.listTorrents()

    let newCount = 0
    let updateCount = 0

    for (const t of torrents) {
      const data = {
        hash: t.hash,
        name: t.name,
        size: t.size,
        progress: t.progress * 100, // 转为百分比
        state: t.state,
        num_seeds: t.num_seeds,
        num_leechs: t.num_leechs,
        added_on: t.added_on,
        completion_on: t.completion_on,
        save_path: t.save_path,
        uploaded: t.uploaded,
        downloaded: t.downloaded,
      }

      if (!torrentExists(t.hash)) {
        addTorrent(data)

        // 获取文件列表
        try {
          const files = await client.torrentFiles(t.hash)
          addFiles(t.hash, files.map((f) => ({
            name: f.name,
            size: f.size,
            progress: f.progress * 100,
          })))
        } catch (error) {
          console.error(`获取文件失败 ${t.hash}:`, error)
        }

        newCount++
      } else {
        updateTorrentStatus(t.hash, data)
        updateCount++
      }
    }

    console.log(`Sync completed: new=${newCount}, updated=${updateCount}`)

    // 保存最后同步时间
    const { saveConfig } = await import('./db')
    saveConfig('last_sync', String(Math.floor(Date.now() / 1000)))

    return { success: true, newCount, updateCount }
  } catch (error: any) {
    console.error('Sync failed:', error)
    return { success: false, error: error.message }
  }
}
