// GET /api/discs/[id] - 获取单个光盘
import { defineEventHandler } from 'h3'
import { getDiscById } from '../../db'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  
  if (!id) {
    return {
      success: false,
      error: '缺少 id 参数',
    }
  }
  
  try {
    const disc = getDiscById(parseInt(id))
    if (disc) {
      return {
        success: true,
        data: JSON.stringify(disc),
      }
    }
    return {
      success: false,
      error: '光盘不存在',
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    }
  }
})
