import {NextRequest, NextResponse} from 'next/server'
import {getTorrent, softDeleteTorrent, softDeleteTorrentFiles} from '@/lib/mongodb'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
    try {
        const hash = request.nextUrl.searchParams.get('hash')
        if (!hash) {
            return NextResponse.json({success: false, error: 'Missing hash'})
        }
        await softDeleteTorrent(hash)

        const torrent = await getTorrent(hash)
        if (torrent?._id) {
            await softDeleteTorrentFiles(torrent._id)
        }

        return NextResponse.json({success: true, data: 'deleted'})
    } catch (error: any) {
        return NextResponse.json({success: false, error: error.message})
    }
}
