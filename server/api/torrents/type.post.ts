// POST /api/torrents/type - 设置种子类型
import { defineEventHandler, getQuery, readBody } from 'h3'
import { setTorrentType } from '../../db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const hash = query.hash as string
  const type = query.type as string
  
  if (!hash || !type) {
    return {
      success: false,
      error: '缺少参数',
    }
  }
  
  try {
    setTorrentType(hash, type)
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
