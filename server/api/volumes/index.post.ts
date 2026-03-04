import { defineEventHandler, readBody } from 'h3'
import { saveVolume } from '#server/db/repository'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { torrent_id, files, volumes } = body
  if (!torrent_id || !files || !Array.isArray(files)) return { success: false, error: 'Missing torrent_id or files' }
  if (!volumes || !Array.isArray(volumes)) return { success: false, error: 'Missing volumes' }

  for (const v of volumes) {
    await saveVolume(torrent_id, files, v)
  }
  return { success: true, data: 'ok' }
})
