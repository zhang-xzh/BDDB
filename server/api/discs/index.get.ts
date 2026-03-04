// GET /api/discs - 获取光盘列表
import { defineEventHandler, getQuery } from 'h3'
import { getAllDiscs, getDiscsByTorrent } from '../../db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const torrentHash = query.torrent_hash as string | undefined
  
  try {
    let discs
    if (torrentHash) {
      discs = getDiscsByTorrent(torrentHash)
    } else {
      discs = getAllDiscs()
    }
    
    return {
      success: true,
      data: JSON.stringify(discs),
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    }
  }
})
