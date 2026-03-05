import { NextRequest, NextResponse } from 'next/server'
import { getAllTorrents, getTorrent, getVolumeCounts } from '@/lib/db/repository'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const state = searchParams.get('state')
  const search = searchParams.get('search')
  const hash = searchParams.get('hash')

  try {
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

    // 一条 SQL 批量取所有 torrent 的 volume 计数，附加到结果中
    const counts = getVolumeCounts()
    const result = torrents.map(t => ({
      ...t,
      volumeCount: t.id ? (counts.get(t.id) ?? 0) : 0,
      hasVolumes: t.id ? (counts.get(t.id) ?? 0) > 0 : false,
    }))

    return NextResponse.json({ success: true, data: JSON.stringify(result) })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message })
  }
}
