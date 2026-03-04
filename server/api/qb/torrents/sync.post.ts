import { defineEventHandler } from 'h3'
import { syncTorrentsFromQb } from '#server/qb'

export default defineEventHandler(async () => {
  const result = await syncTorrentsFromQb()
  return result.success
    ? { success: true, data: 'synced' }
    : { success: false, error: result.error }
})
