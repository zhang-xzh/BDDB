import { defineEventHandler, getQuery } from 'h3'
import { getVolumesByTorrent, getVolumesByFile, getAllVolumes } from '#server/db/repository'

export default defineEventHandler(async (event) => {
  const { torrent_id, torrent_file_id } = getQuery(event)
  const volumes = torrent_id
    ? await getVolumesByTorrent(torrent_id as string)
    : torrent_file_id
      ? await getVolumesByFile(torrent_file_id as string)
      : await getAllVolumes()
  return { success: true, data: JSON.stringify(volumes) }
})
