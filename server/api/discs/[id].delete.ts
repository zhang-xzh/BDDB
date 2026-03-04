// DELETE /api/discs/[id] - 删除光盘
import { defineEventHandler } from 'h3'
import { deleteDisc } from '../../db'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  
  if (!id) {
    return {
      success: false,
      error: '缺少 id 参数',
    }
  }
  
  try {
    deleteDisc(parseInt(id))
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
