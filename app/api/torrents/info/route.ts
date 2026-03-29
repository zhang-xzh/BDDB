import {NextRequest, NextResponse} from 'next/server'
import {getAllTorrents, getTorrent, getVolumeCounts} from '@/lib/mongodb'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const state = searchParams.get('state')
    const search = searchParams.get('search')
    const hash = searchParams.get('hash')

    // 分页参数
    const pageParam = searchParams.get('page')
    const pageSizeParam = searchParams.get('pageSize')

    try {
        if (hash) {
            const torrent = await getTorrent(hash)
            if (!torrent) {
                return NextResponse.json({success: false, error: 'Not found'})
            }
            return NextResponse.json({success: true, data: [{...torrent, _id: torrent._id.toString()}]})
        }

        let torrents = await getAllTorrents()

        // 默认按 name 排序
        torrents.sort((a, b) => (a.name || '').localeCompare(b.name || ''))

        if (state) {
            torrents = torrents.filter(t => {
                if (state === 'paused') return t.state?.includes('paused')
                if (state === 'completed') return t.progress === 1
                return t.state === state
            })
        }
        const invertSearch = searchParams.get('invertSearch') === 'true'
        if (search) {
            const k = search.toLowerCase()
            torrents = torrents.filter(t => {
                const match = t.name?.toLowerCase().includes(k)
                return invertSearch ? !match : match
            })
        }

        // hasVolumes 筛选（在获取 volume 计数后处理）
        const hasVolumesParam = searchParams.get('hasVolumes')
        const filterHasVolumes = hasVolumesParam === 'true' ? true : hasVolumesParam === 'false' ? false : undefined

        const counts = await getVolumeCounts()
        let result = torrents.map(t => {
            const id = t._id.toString()
            return {
                ...t,
                _id: id,
                volumeCount: counts.get(id) ?? 0,
                hasVolumes: (counts.get(id) ?? 0) > 0,
            }
        })

        // 应用 hasVolumes 筛选
        if (filterHasVolumes !== undefined) {
            result = result.filter(t => t.hasVolumes === filterHasVolumes)
        }

        // 分页模式
        if (pageParam && pageSizeParam) {
            const page = parseInt(pageParam, 10) || 1
            const pageSize = parseInt(pageSizeParam, 10) || 100
            const start = (page - 1) * pageSize
            const pagedData = result.slice(start, start + pageSize)
            return NextResponse.json({
                success: true,
                data: {
                    data: pagedData,
                    total: result.length,
                    page,
                    pageSize,
                }
            })
        }

        // 全量模式（向后兼容）
        return NextResponse.json({success: true, data: result})
    } catch (error: any) {
        return NextResponse.json({success: false, error: error.message})
    }
}
