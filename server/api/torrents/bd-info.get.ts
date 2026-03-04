// GET /api/torrents/bd-info - 获取 BD 信息
import { defineEventHandler, getQuery } from 'h3'
import { getBdInfo } from '../../db'

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
    const info = getBdInfo(hash)
    return {
      success: true,
      data: JSON.stringify(info || {}),
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    }
  }
})
