export const runtime = 'nodejs';

import {NextRequest, NextResponse} from 'next/server';
import {getAllWorks, getVolumeById, saveVolume} from '@/lib/mongodb';
import {ObjectId} from 'mongodb';

export async function GET(
    request: NextRequest,
    {params}: { params: Promise<{ id: string }> }
) {
    try {
        const {id: volumeId} = await params;
        const volume = await getVolumeById(volumeId);

        if (!volume) {
            return NextResponse.json(
                {success: false, error: 'Volume not found'},
                {status: 404}
            );
        }

        // 获取所有 works，然后筛选出与当前 volume 关联的
        const allWorks = await getAllWorks();
        const volumeWorkIds = new Set(volume.work_ids?.map(id => id.toString()) ?? []);
        const associatedWorks = allWorks.filter(w => volumeWorkIds.has(w._id.toString()));

        const result = associatedWorks.map(w => ({
            ...w,
            _id: w._id.toString(),
        }));

        return NextResponse.json({success: true, data: result});
    } catch (error) {
        return NextResponse.json(
            {success: false, error: error instanceof Error ? error.message : 'Unknown error'},
            {status: 500},
        );
    }
}

export async function POST(
    request: NextRequest,
    {params}: { params: Promise<{ id: string }> }
) {
    try {
        const {id: volumeId} = await params;
        const body = await request.json();
        const {work_ids} = body as { work_ids: string[] };

        if (!Array.isArray(work_ids)) {
            return NextResponse.json(
                {success: false, error: 'Missing work_ids'},
                {status: 400}
            );
        }

        const volume = await getVolumeById(volumeId);
        if (!volume) {
            return NextResponse.json(
                {success: false, error: 'Volume not found'},
                {status: 404}
            );
        }

        // 更新 volume 的 work_ids
        const updatedVolume = {
            ...volume,
            work_ids: work_ids.map(id => new ObjectId(id)),
        };

        await saveVolume(updatedVolume);

        return NextResponse.json({success: true});
    } catch (error) {
        return NextResponse.json(
            {success: false, error: error instanceof Error ? error.message : 'Unknown error'},
            {status: 500},
        );
    }
}
