import {NextRequest, NextResponse} from 'next/server'
import {getTorrent, getTorrentFilesAsFileItems, saveTorrentFiles} from '@/lib/mongodb'
import {getQbClient} from '@/lib/qb'

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

        const qb = getQbClient()
        const qbFiles = await qb.torrentFiles(hash)
        const files = qbFiles || []

        await saveTorrentFiles(torrent._id, files)

        const dbFiles = await getTorrentFilesAsFileItems(torrent._id)
        return NextResponse.json({success: true, data: dbFiles})
    } catch (error: any) {
        return NextResponse.json({success: false, error: error.message})
    }
}
