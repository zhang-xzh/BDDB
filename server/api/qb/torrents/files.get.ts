import { defineEventHandler, getQuery } from 'h3'
import { getTorrent, saveTorrentFiles, getTorrentFiles } from '#server/db/repository'
import { getQbClient } from '#server/qb'

export default defineEventHandler(async (event) => {
  const hash = getQuery(event).hash as string
  if (!hash) return { success: false, error: 'Missing hash' }
  
  const torrent = await getTorrent(hash)
  if (!torrent) return { success: false, error: 'Torrent not found' }
  
  const qb = getQbClient()
  const qbFiles = await qb.getTorrentsFiles([hash])
  const files = qbFiles[0]?.files || []
  
  // 保存文件到数据库，使用 torrent._id
  await saveTorrentFiles(torrent._id!, files.map(f => ({
    name: f.name,
    size: f.size,
    index: f.index,
    piece_range: f.pieceRange,
    progress: f.progress,
    priority: f.priority,
    availability: f.availability,
  })))
  
  const dbFiles = await getTorrentFiles(torrent._id!)
  return { success: true, data: JSON.stringify(dbFiles) }
})
