// POST /api/discs - 创建新光盘
import { defineEventHandler, readBody } from 'h3'
import { addDisc } from '../../db'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    const {
      torrent_hash,
      catalog_no,
      catalog_maker,
      maker,
      release_date,
      version_type,
      bonus_status,
      suruga_id,
      volume_no,
      disc_no,
      disc_type,
      note,
      node_data,
    } = body

    if (!torrent_hash) {
      return {
        success: false,
        error: '缺少 torrent_hash 参数',
      }
    }

    // 保存光盘信息
    addDisc({
      torrent_hash,
      root_path: '',
      disc_type,
      catalog_no: catalog_no || '',
      catalog_maker: catalog_maker || '',
      maker: maker || '',
      release_date: release_date || '',
      version_type: version_type || '',
      bonus_status: bonus_status || '',
      suruga_id: suruga_id || '',
      volume_no: volume_no || 0,
      disc_no: disc_no || 1,
      note: note || '',
    })

    // TODO: 保存 node_data 到单独表

    return {
      success: true,
      message: '创建成功',
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    }
  }
})
