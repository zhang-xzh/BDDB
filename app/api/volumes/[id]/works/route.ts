import {NextRequest, NextResponse} from 'next/server'
import {ObjectId} from 'mongodb'
import type {BangumiCollection, BangumiImages, BangumiRating, BddbWork} from '@/lib/mongodb/bddbRepository'
import {getVolumeById, getWorkById, removeWorkFromVolume, saveWorkFromBangumi} from '@/lib/mongodb/bddbRepository'
import {getMongoCollection} from '@/lib/mongodb/connection'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SaveWorkRequest {
    works: Array<{
        id: number
        url: string
        type: number
        name: string
        name_cn: string
        summary: string
        eps: number
        air_date: string
        air_weekday: number
        images: BangumiImages
        rating: BangumiRating
        rank: number
        collection: BangumiCollection
    }> | null
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

        // 返回完整的 work 数据（直接从数据库读取）
        const result = works.map(work => ({
            id: work.id,
            url: work.url,
            type: work.type,
            name: work.name,
            name_cn: work.name_cn,
            summary: work.summary,
            eps: work.eps,
            air_date: work.air_date,
            air_weekday: work.air_weekday,
            images: work.images,
            rating: work.rating,
            rank: work.rank,
            collection: work.collection,
            crt: work.crt,
            staff: work.staff,
        }))

        return NextResponse.json({success: true, data: result})
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
        const {works} = body

        // 获取 Volume
        const volume = await getVolumeById(volumeId)
        if (!volume) {
            return NextResponse.json(
                {success: false, error: 'Volume not found'},
                {status: 404}
            )
        }

        // 如果没有选择作品，清除所有关联
        if (!works || works.length === 0) {
            const collection = await getMongoCollection('bddb_volumes')
            await collection.updateOne(
                {_id: new ObjectId(volumeId)},
                {$set: {work_ids: [], updated_at: Math.floor(Date.now() / 1000)}}
            )
            return NextResponse.json({success: true, data: {workIds: []}})
        }

        // 保存所有 works 并获取它们的 _id
        const savedWorkIds: string[] = []
        for (const work of works) {
            const savedWork = await saveWorkFromBangumi(work)
            savedWorkIds.push(savedWork._id.toString())
        }

        // 替换 volume 的 work_ids 数组
        const collection = await getMongoCollection('bddb_volumes')
        await collection.updateOne(
            {_id: new ObjectId(volumeId)},
            {
                $set: {
                    work_ids: savedWorkIds.map(id => new ObjectId(id)),
                    updated_at: Math.floor(Date.now() / 1000)
                }
            }
        )

        return NextResponse.json({
            success: true,
            data: {workIds: savedWorkIds}
        })
    } catch (error) {
        console.error('[API] POST /api/volumes/[id]/works error:', error)
        return NextResponse.json(
            {success: false, error: 'Failed to save works'},
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
