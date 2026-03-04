import { defineEventHandler, getQuery } from 'h3'
import { getVolumesByFile } from '#server/db/repository'

export default defineEventHandler(async (event) => {
  const { torrent_id, torrent_file_id } = getQuery(event) as { torrent_id?: string, torrent_file_id?: string }
  if (!torrent_file_id) return { success: false, error: 'Missing torrent_file_id' }
  const volumes = await getVolumesByFile(torrent_file_id)
  return { success: true, data: JSON.stringify(volumes) }
})
