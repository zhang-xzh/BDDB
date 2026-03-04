import { defineEventHandler, readBody } from 'h3'
import { addVolume, deleteVolumesByTorrent } from '#server/db/repository'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { torrent_hash, volumes } = body
  if (!torrent_hash) return { success: false, error: 'Missing torrent_hash' }

  if (volumes && Array.isArray(volumes)) {
    await deleteVolumesByTorrent(torrent_hash)
    for (const v of volumes) {
      await addVolume({ ...v, torrent_hash })
    }
  }
  return { success: true, data: 'ok' }
})
