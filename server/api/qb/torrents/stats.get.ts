// GET /api/qb/torrents/stats - 统计信息
import { defineEventHandler } from 'h3'
import { getStats } from '#server/db'

export default defineEventHandler(async () => {
  try {
    const stats = getStats()
    return {
      success: true,
      data: JSON.stringify(stats),
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    }
  }
})
