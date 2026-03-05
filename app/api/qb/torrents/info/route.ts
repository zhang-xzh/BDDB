import { NextRequest, NextResponse } from 'next/server'
import { getAllTorrents, getTorrent } from '@/lib/db/repository'

// 使用 Node.js runtime 而不是 Edge
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const state = searchParams.get('state')
  const search = searchParams.get('search')
  const hash = searchParams.get('hash')

  try {
    // 如果指定了 hash，返回单个 torrent
    if (hash) {
      const torrent = await getTorrent(hash)
      if (!torrent) {
        return NextResponse.json({ success: false, error: 'Not found' })
      }
      return NextResponse.json({ success: true, data: JSON.stringify([torrent]) })
    }

    let torrents = await getAllTorrents()

    if (state) {
      torrents = torrents.filter(t => {
        const tState = t.qb_torrent?.state
        const tProgress = t.qb_torrent?.progress
        if (state === 'paused') return tState?.includes('paused')
        if (state === 'completed') return tProgress === 100
        return tState === state
      })
    }
    if (search) {
      const k = search.toLowerCase()
      torrents = torrents.filter(t => t.qb_torrent?.name?.toLowerCase().includes(k))
    }

    return NextResponse.json({ success: true, data: JSON.stringify(torrents) })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message })
  }
}
