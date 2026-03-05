import { NextRequest, NextResponse } from 'next/server'
import { softDeleteTorrent, softDeleteTorrentFiles } from '@/lib/db/repository'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const hash = request.nextUrl.searchParams.get('hash')
    if (!hash) {
      return NextResponse.json({ success: false, error: 'Missing hash' })
    }
    await softDeleteTorrent(hash)
    await softDeleteTorrentFiles(hash)
    return NextResponse.json({ success: true, data: 'deleted' })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message })
  }
}
