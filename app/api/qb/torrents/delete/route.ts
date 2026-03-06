import { NextRequest, NextResponse } from 'next/server'
import { softDeleteTorrent, softDeleteTorrentFiles, getTorrent } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const hash = request.nextUrl.searchParams.get('hash')
    if (!hash) {
      return NextResponse.json({ success: false, error: 'Missing hash' })
    }
    await softDeleteTorrent(hash)
    
    // 获取 torrent id 再删除文件
    const torrent = await getTorrent(hash)
    if (torrent?.id) {
      await softDeleteTorrentFiles(torrent.id)
    }
    
    return NextResponse.json({ success: true, data: 'deleted' })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message })
  }
}
