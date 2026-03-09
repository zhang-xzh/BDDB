import {NextRequest, NextResponse} from 'next/server'
import {getAllTorrents, getTorrent, getVolumeCounts} from '@/lib/mongodb'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const state = searchParams.get('state')
    const search = searchParams.get('search')
    const hash = searchParams.get('hash')

    try {
        if (hash) {
            const torrent = await getTorrent(hash)
            if (!torrent) {
                return NextResponse.json({success: false, error: 'Not found'})
            }
            return NextResponse.json({success: true, data: [{...torrent, _id: torrent._id.toString()}]})
        }

        let torrents = await getAllTorrents()

        if (state) {
            torrents = torrents.filter(t => {
                if (state === 'paused') return t.state?.includes('paused')
                if (state === 'completed') return t.progress === 100
                return t.state === state
            })
        }
        if (search) {
            const k = search.toLowerCase()
            torrents = torrents.filter(t => t.name?.toLowerCase().includes(k))
        }

        const counts = await getVolumeCounts()
        const result = torrents.map(t => {
            const id = t._id.toString()
            return {
                ...t,
                _id: id,
                volumeCount: counts.get(id) ?? 0,
                hasVolumes: (counts.get(id) ?? 0) > 0,
            }
        })

        return NextResponse.json({success: true, data: result})
    } catch (error: any) {
        return NextResponse.json({success: false, error: error.message})
    }
}
