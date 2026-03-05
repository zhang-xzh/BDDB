import { NextRequest, NextResponse } from 'next/server'
import { getTorrent, saveTorrentFiles, getTorrentFiles } from '@/lib/db/repository'
import { getQbClient } from '@/lib/qb'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const hash = request.nextUrl.searchParams.get('hash')
    if (!hash) {
      return NextResponse.json({ success: false, error: 'Missing hash' })
    }

    const torrent = await getTorrent(hash)
    if (!torrent) {
      return NextResponse.json({ success: false, error: 'Torrent not found' })
    }

    const qb = getQbClient()
    const qbFiles = await qb.torrentFiles(hash)
    const files = qbFiles || []

    // 保存文件到数据库，使用 torrent._id
    await saveTorrentFiles(torrent._id!, files.map(f => ({
      name: f.name,
      size: f.size,
      piece_range: (f as any).piece_range as [number, number] | undefined,
      progress: f.progress,
      priority: f.priority,
      availability: f.availability,
    })))

    const dbFiles = await getTorrentFiles(torrent._id!)
    return NextResponse.json({ success: true, data: JSON.stringify(dbFiles) })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message })
  }
}
