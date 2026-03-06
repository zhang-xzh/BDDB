import {NextRequest, NextResponse} from 'next/server'
import {getTorrent, getTorrentFilesAsFileItems} from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
    try {
        const hash = request.nextUrl.searchParams.get('hash')
        if (!hash) {
            return NextResponse.json({success: false, error: 'Missing hash'})
        }
        const torrent = await getTorrent(hash)
        if (!torrent) {
            return NextResponse.json({success: false, error: 'Torrent not found'})
        }
        const files = await getTorrentFilesAsFileItems(torrent.id!)
        return NextResponse.json({success: true, data: JSON.stringify(files)})
    } catch (error: any) {
        return NextResponse.json({success: false, error: error.message})
    }
}
