import { defineEventHandler, getQuery, readBody } from 'h3'
import { saveVolume } from '#server/db/repository'

export default defineEventHandler(async (event) => {
  const { torrent_id } = getQuery(event) as { torrent_id?: string }
  const body = await readBody(event)
  const { files, ...volumeData } = body
  if (!torrent_id || !files || !Array.isArray(files)) return { success: false, error: 'Missing torrent_id or files' }
  await saveVolume(torrent_id, files, volumeData)
  return { success: true, data: 'ok' }
})
