// PUT /api/discs/[id] - 更新光盘
import { defineEventHandler, readBody } from 'h3'
import { updateDisc } from '../../db'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  const body = await readBody(event)
  
  if (!id) {
    return {
      success: false,
      error: '缺少 id 参数',
    }
  }
  
  try {
    updateDisc(parseInt(id), body || {})
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
