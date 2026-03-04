// POST /api/qb/torrents/sync - 同步 qBittorrent
import { defineEventHandler } from 'h3'
import { syncTorrentsFromQb } from '../../../qb'

export default defineEventHandler(async () => {
  try {
    const result = await syncTorrentsFromQb()
    if (result.success) {
      return {
        success: true,
        data: 'syncing',
      }
    } else {
      return {
        success: false,
        error: result.error,
      }
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    }
  }
})
