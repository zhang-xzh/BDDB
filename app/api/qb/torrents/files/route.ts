import { NextRequest, NextResponse } from 'next/server'
import { getTorrent, saveTorrentFiles, getTorrentFilesAsFileItems } from '@/lib/db/repository'
import { getQbClient } from '@/lib/qb'

const now = () => Math.floor(Date.now() / 1000)

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

    // 保存文件到数据库，使用 torrent.id
    await saveTorrentFiles(torrent.id!, files.map(f => ({
      qb_torrent_file: f,
      is_deleted: 0,
      synced_at: now(),
    })))

    const dbFiles = await getTorrentFilesAsFileItems(torrent.id!)
    return NextResponse.json({ success: true, data: JSON.stringify(dbFiles) })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message })
  }
}
