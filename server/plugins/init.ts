// 服务器插件 - 初始化数据库
import { defineNitroPlugin } from 'nitropack/runtime'
import { initDb } from '../db'

export default defineNitroPlugin(() => {
  console.log('Initializing database...')
  initDb()
  console.log('Database initialized successfully')
})
