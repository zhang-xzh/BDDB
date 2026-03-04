// POST /api/torrents/bd-info - 保存 BD 信息
import { defineEventHandler, getQuery, readBody } from 'h3'
import { saveBdInfo } from '../../db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const hash = query.hash as string
  const body = await readBody(event)
  
  if (!hash) {
    return {
      success: false,
      error: '缺少 hash 参数',
    }
  }
  
  try {
    saveBdInfo(hash, body || {})
    return {
      success: true,
      data: 'ok',
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    }
  }
})
