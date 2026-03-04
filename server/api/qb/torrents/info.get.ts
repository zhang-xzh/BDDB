// GET /api/qb/torrents/info - 获取种子列表
import { defineEventHandler, getQuery } from 'h3'
import { getAllTorrents, getFiles } from '../../../db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const state = query.state as string | undefined
  const type = query.type as string | undefined
  const search = query.search as string | undefined
  
  try {
    let torrents = getAllTorrents()
    
    // 过滤
    if (state) {
      torrents = torrents.filter(t => {
        if (state === 'paused') return t.state.includes('paused')
        if (state === 'completed') return t.progress === 100
        return t.state === state
      })
    }
    
    if (type) {
      torrents = torrents.filter(t => t.torrent_type === type)
    }
    
    if (search) {
      const searchLower = search.toLowerCase()
      torrents = torrents.filter(t => t.name.toLowerCase().includes(searchLower))
    }
    
    // 添加文件数量
    torrents = torrents.map(t => ({
      ...t,
      file_count: getFiles(t.hash).length,
    }))
    
    return {
      success: true,
      data: JSON.stringify(torrents),
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    }
  }
})
