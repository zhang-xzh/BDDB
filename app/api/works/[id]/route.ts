export const runtime = 'nodejs';

import {NextRequest, NextResponse} from 'next/server';
import {ObjectId} from 'mongodb';
import {getWorkById} from '@/lib/mongodb/bddbRepository';

/**
 * GET /api/works/[id]
 * 根据 ID 获取单个作品
 */
export async function GET(
    request: NextRequest,
    {params}: { params: Promise<{ id: string }> }
) {
    try {
        const {id} = await params;

        if (!ObjectId.isValid(id)) {
            return NextResponse.json(
                {success: false, error: 'Invalid work ID'},
                {status: 400}
            );
        }

        const work = await getWorkById(id);

        if (!work) {
            return NextResponse.json(
                {success: false, error: 'Work not found'},
                {status: 404}
            );
        }

        // 转换 ObjectId 为字符串
        const result = {
            ...work,
            _id: work._id.toString(),
        };

        return NextResponse.json({success: true, data: result});
    } catch (error) {
        console.error('[API] GET /api/works/[id] error:', error);
        return NextResponse.json(
            {success: false, error: 'Failed to fetch work'},
            {status: 500}
        );
    }
}
