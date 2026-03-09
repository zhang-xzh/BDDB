export const runtime = 'nodejs';

import {NextRequest, NextResponse} from 'next/server';
import {getVolumeById, getVolumeFilesAsFileItems} from '@/lib/mongodb';

export async function GET(
    _request: NextRequest,
    {params}: {params: Promise<{id: string}>}
) {
    try {
        const {id} = await params;

        const vol = await getVolumeById(id);
        if (!vol) {
            return NextResponse.json({success: false, error: 'Volume not found'}, {status: 404});
        }

        const files = await getVolumeFilesAsFileItems(id);
        return NextResponse.json({success: true, data: files});
    } catch (error) {
        return NextResponse.json(
            {success: false, error: error instanceof Error ? error.message : 'Unknown error'},
            {status: 500},
        );
    }
}
