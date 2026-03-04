// GET /api/qb/torrents/files - 获取文件列表
import { defineEventHandler, getQuery } from 'h3'
import { getFiles } from '#server/db'

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
    const files = getFiles(hash)
    return {
      success: true,
      data: JSON.stringify(files),
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    }
  }
})
