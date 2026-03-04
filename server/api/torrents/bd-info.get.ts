import { defineEventHandler, getQuery } from 'h3'
import { getVolumesByTorrent } from '#server/db/repository'

export default defineEventHandler(async (event) => {
  const hash = getQuery(event).hash as string
  if (!hash) return { success: false, error: 'Missing hash' }
  const volumes = await getVolumesByTorrent(hash)
  return { success: true, data: JSON.stringify(volumes) }
})
