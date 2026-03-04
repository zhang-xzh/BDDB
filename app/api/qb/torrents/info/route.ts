import { NextRequest, NextResponse } from 'next/server'
import { getTorrent, getAllTorrents, searchTorrents } from '@/lib/db/repository'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const hash = searchParams.get('hash')
  const state = searchParams.get('state')
  const search = searchParams.get('search')
  
  try {
    let torrents
    if (hash) {
      const torrent = await getTorrent(hash)
      torrents = torrent ? [torrent] : []
    } else if (search) {
      torrents = await searchTorrents(search)
    } else {
      torrents = await getAllTorrents()
    }
    
    return NextResponse.json({ success: true, data: JSON.stringify(torrents) })
  } catch (error) {
    console.error('Get torrents error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}