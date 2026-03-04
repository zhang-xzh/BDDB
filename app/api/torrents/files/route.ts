import { NextRequest, NextResponse } from 'next/server'
import { getTorrentFiles, saveTorrentFiles } from '@/lib/db/repository'
import { getQbittorrentClient } from '@/lib/qb'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const hash = searchParams.get('hash')
  
  if (!hash) {
    return NextResponse.json({ success: false, error: 'Hash required' }, { status: 400 })
  }
  
  const files = await getTorrentFiles(hash)
  return NextResponse.json({ success: true, data: files })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { torrent_id, files } = body
    
    if (!torrent_id || !files) {
      return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 })
    }
    
    await saveTorrentFiles(torrent_id, files)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Save files error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}