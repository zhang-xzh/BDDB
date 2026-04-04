import {NextResponse} from 'next/server'
import {ensureMeiliConnected, rebuildBangumiIndex} from '@/lib/meilisearch'

export const runtime = 'nodejs'

export async function POST() {
    try {
        // 检查连接
        const connected = await ensureMeiliConnected()
        if (!connected) {
            return NextResponse.json({
                success: false,
                error: 'Failed to connect to Meilisearch',
            }, {status: 500})
        }

        // 执行重建
        const result = await rebuildBangumiIndex()

        return NextResponse.json({
            success: true,
            data: {
                total: result.total,
                indexed: result.indexed,
            },
        })
    } catch (error: any) {
        console.error('[API] bangumi rebuild error:', error)
        return NextResponse.json({
            success: false,
            error: error.message || 'Rebuild failed',
        }, {status: 500})
    }
}
