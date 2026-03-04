// POST /api/qb/torrents/delete - 删除种子
import { defineEventHandler, getQuery } from 'h3'
import { softDeleteTorrent } from '../../../db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const hash = query.hash as string
  
  if (!hash) {
    return {
      success: false,
      error: '缺少 hash 参数',
    }
  }
  
  try {
    softDeleteTorrent(hash)
    return {
      success: true,
      data: 'deleted',
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    }
  }
})
