// POST /api/config - 保存配置
import { defineEventHandler, readBody } from 'h3'
import { saveConfig } from '../../db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  
  try {
    if (body && typeof body === 'object') {
      for (const [key, value] of Object.entries(body)) {
        saveConfig(key, String(value))
      }
    }
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
