import { NextResponse } from 'next/server'
import { getAllTorrents } from '@/lib/db/repository'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const torrents = await getAllTorrents()
    const stats = {
      total: torrents.length,
      downloading: torrents.filter(t => t.qb_torrent?.state === 'downloading').length,
      seeding: torrents.filter(t => t.qb_torrent?.state === 'uploading').length,
      paused: torrents.filter(t => t.qb_torrent?.state?.includes('paused')).length,
      total_size: torrents.reduce((acc, t) => acc + (t.qb_torrent?.size || 0), 0),
    }
    return NextResponse.json({ success: true, data: JSON.stringify(stats) })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message })
  }
}
