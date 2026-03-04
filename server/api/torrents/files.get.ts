import { defineEventHandler, getQuery } from 'h3'
import { getTorrent, getTorrentFiles } from '#server/db/repository'

export default defineEventHandler(async (event) => {
  const hash = getQuery(event).hash as string
  if (!hash) return { success: false, error: 'Missing hash' }
  const torrent = await getTorrent(hash)
  if (!torrent) return { success: false, error: 'Torrent not found' }
  const files = await getTorrentFiles(torrent._id!)
  return { success: true, data: JSON.stringify(files) }
})
