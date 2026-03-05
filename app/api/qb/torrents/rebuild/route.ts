import { NextRequest, NextResponse } from 'next/server'
import { clearAllData } from '@/lib/db/repository'
import {getQbClient, syncTorrentsFromQb} from '@/lib/qb'

// 使用 Node.js runtime 而不是 Edge
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const rebuildCategory = body.rebuildCategory

    if (rebuildCategory) {
      // 仅重建 category 字段：从 qBittorrent 获取最新数据并更新
      const client = getQbClient()
      const qbTorrents = await client.listTorrents()
      
      const db = require('@/lib/db/index').getDb('torrents')
      let updateCount = 0

      for (const qt of qbTorrents) {
        await new Promise<void>((resolve, reject) => {
          db.update(
            { hash: qt.hash },
            { $set: { 
              category: qt.category || '',
              synced_at: Math.floor(Date.now() / 1000)
            } },
            {},
            (err: any, num: number) => {
              if (err) reject(err)
              else {
                if (num > 0) updateCount++
                resolve()
              }
            }
          )
        })
      }

      return NextResponse.json({ 
        success: true, 
        message: `已更新 ${updateCount} 个种子的 category 字段`
      })
    } else {
      // 完全重建：清空所有数据并重新同步
      await clearAllData()
      const result = await syncTorrentsFromQb()
      
      return NextResponse.json({
        message: '数据已完全重建',
        ...result
      })
    }
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
