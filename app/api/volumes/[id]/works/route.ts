import {NextRequest, NextResponse} from 'next/server'
import {ObjectId} from 'mongodb'
import {saveWorkFromBangumi, addWorkToVolume, removeWorkFromVolume, getWorkById, getVolumeById} from '@/lib/mongodb/bddbRepository'
import type {SiteInfo, BddbWork} from '@/lib/mongodb/bddbRepository'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SaveWorkRequest {
    work: {
        id: string
        title: string
        titleCn: string
        titleEn: string
        type: string
        lang: string
        officialSite: string
        begin: string
        end: string
        broadcast?: string
        comment?: string
        sites: SiteInfo[]
    } | null
}

// ─── GET /api/volumes/[id]/works ───────────────────────────────────────────────

export async function GET(
    request: NextRequest,
    {params}: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    try {
        const {id: volumeId} = await params

        if (!ObjectId.isValid(volumeId)) {
            return NextResponse.json(
                {success: false, error: 'Invalid volume ID'},
                {status: 400}
            )
        }

        // 获取 Volume
        const volume = await getVolumeById(volumeId)
        if (!volume) {
            return NextResponse.json(
                {success: false, error: 'Volume not found'},
                {status: 404}
            )
        }

        // 获取关联的 Works
        const works: BddbWork[] = []
        if (volume.work_ids && volume.work_ids.length > 0) {
            for (const workId of volume.work_ids) {
                const work = await getWorkById(workId.toString())
                if (work) {
                    works.push(work)
                }
            }
        }

        return NextResponse.json({success: true, data: works})
    } catch (error) {
        console.error('[API] GET /api/volumes/[id]/works error:', error)
        return NextResponse.json(
            {success: false, error: 'Failed to get works'},
            {status: 500}
        )
    }
}

// ─── POST /api/volumes/[id]/works ──────────────────────────────────────────────

export async function POST(
    request: NextRequest,
    {params}: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    try {
        const {id: volumeId} = await params

        if (!ObjectId.isValid(volumeId)) {
            return NextResponse.json(
                {success: false, error: 'Invalid volume ID'},
                {status: 400}
            )
        }

        const body: SaveWorkRequest = await request.json()
        const {work} = body

        // 如果没有选择作品，清除关联
        if (!work) {
            // TODO: 清除 volume 的 work_ids
            return NextResponse.json({success: true})
        }

        // 1. 保存/获取 Work
        const savedWork = await saveWorkFromBangumi(work)

        // 2. 关联到 Volume
        await addWorkToVolume(volumeId, savedWork._id.toString())

        return NextResponse.json({
            success: true,
            data: {
                workId: savedWork._id.toString(),
                bangumiSubjectId: savedWork.bangumiSubjectId,
            }
        })
    } catch (error) {
        console.error('[API] POST /api/volumes/[id]/works error:', error)
        return NextResponse.json(
            {success: false, error: 'Failed to save work'},
            {status: 500}
        )
    }
}

// ─── DELETE /api/volumes/[id]/works ───────────────────────────────────────────

export async function DELETE(
    request: NextRequest,
    {params}: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    try {
        const {id: volumeId} = await params
        const {workId} = await request.json()

        if (!ObjectId.isValid(volumeId) || !ObjectId.isValid(workId)) {
            return NextResponse.json(
                {success: false, error: 'Invalid ID'},
                {status: 400}
            )
        }

        await removeWorkFromVolume(volumeId, workId)

        return NextResponse.json({success: true})
    } catch (error) {
        console.error('[API] DELETE /api/volumes/[id]/works error:', error)
        return NextResponse.json(
            {success: false, error: 'Failed to remove work'},
            {status: 500}
        )
    }
}
