// GET /api/config - 获取配置
import { defineEventHandler } from 'h3'
import { getAllConfig } from '../../db'

export default defineEventHandler(async () => {
  try {
    const config = getAllConfig()
    return {
      success: true,
      data: JSON.stringify(config),
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    }
  }
})
