import { defineEventHandler, getQuery } from 'h3'
import { getVolumesByTorrent, getVolumesByBoxId, getAllVolumes } from '#server/db/repository'

export default defineEventHandler(async (event) => {
  const { torrent_hash, box_id } = getQuery(event)
  const volumes = torrent_hash
    ? await getVolumesByTorrent(torrent_hash as string)
    : box_id
      ? await getVolumesByBoxId(box_id as string)
      : await getAllVolumes()
  return { success: true, data: JSON.stringify(volumes) }
})
