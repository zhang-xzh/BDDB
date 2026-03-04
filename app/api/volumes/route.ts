import { NextRequest, NextResponse } from 'next/server'
import { saveVolume, getVolumesByTorrent, getVolumesByFile, getAllVolumes } from '@/lib/db/repository'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const torrent_id = searchParams.get('torrent_id')
  const torrent_file_id = searchParams.get('torrent_file_id')
  
  const volumes = torrent_id
    ? await getVolumesByTorrent(torrent_id)
    : torrent_file_id
      ? await getVolumesByFile(torrent_file_id)
      : await getAllVolumes()
  
  return NextResponse.json({ success: true, data: volumes })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { torrent_id, files, volumes } = body
    
    if (!torrent_id || !volumes || !Array.isArray(volumes)) {
      return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 })
    }
    
    const results = []
    for (const vol of volumes) {
      await saveVolume(torrent_id, files || [], vol)
      results.push(vol)
    }
    
    return NextResponse.json({ success: true, data: results })
  } catch (error) {
    console.error('Save volume error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}