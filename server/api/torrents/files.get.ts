import { defineEventHandler, getQuery } from 'h3'
import { getTorrent } from '#server/db/repository'

export default defineEventHandler(async (event) => {
  const hash = getQuery(event).hash as string
  if (!hash) return { success: false, error: 'Missing hash' }
  const torrent = await getTorrent(hash)
  if (!torrent) return { success: false, error: 'Not found' }
  return { success: true, data: JSON.stringify(torrent.files || []) }
})
