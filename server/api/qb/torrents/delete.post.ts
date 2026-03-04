import { defineEventHandler, getQuery } from 'h3'
import { softDeleteTorrent, softDeleteTorrentFiles } from '#server/db/repository'

export default defineEventHandler(async (event) => {
  const hash = getQuery(event).hash as string
  if (!hash) return { success: false, error: 'Missing hash' }
  await softDeleteTorrent(hash)
  await softDeleteTorrentFiles(hash)
  return { success: true, data: 'deleted' }
})
