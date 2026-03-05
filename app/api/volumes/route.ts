import { NextRequest, NextResponse } from 'next/server'
import { getVolumesByTorrent, getVolumesByFile, getAllVolumes } from '@/lib/db/repository'
import { saveVolume } from '@/lib/db/repository'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const torrent_id = searchParams.get('torrent_id')
    const torrent_file_id = searchParams.get('torrent_file_id')

    const volumes = torrent_id
      ? await getVolumesByTorrent(torrent_id)
      : torrent_file_id
        ? await getVolumesByFile(torrent_file_id)
        : await getAllVolumes()

    return NextResponse.json({ success: true, data: JSON.stringify(volumes) })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { torrent_id, files, volumes } = body

    if (!torrent_id || !files || !Array.isArray(files)) {
      return NextResponse.json({ success: false, error: 'Missing torrent_id or files' })
    }
    if (!volumes || !Array.isArray(volumes)) {
      return NextResponse.json({ success: false, error: 'Missing volumes' })
    }

    for (const v of volumes) {
      await saveVolume(torrent_id, files, v)
    }

    return NextResponse.json({ success: true, data: 'ok' })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message })
  }
}
