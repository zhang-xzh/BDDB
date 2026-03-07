export const runtime = 'nodejs';

import {NextRequest, NextResponse} from 'next/server';
import {getMediasByVolume, saveMedia, deleteStaleMedias} from '@/lib/db';
import type {MediaType} from '@/lib/db';

export async function GET(
    request: NextRequest,
    {params}: { params: Promise<{ id: string }> }
) {
    try {
        const {id: volumeId} = await params;
        const medias = await getMediasByVolume(volumeId);
        return NextResponse.json({success: true, data: JSON.stringify(medias)});
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
        const {medias} = body as {
            medias: Array<{
                media_no: number;
                media_type: MediaType;
                content_title?: string;
                description?: string;
                files: string[];
            }>;
        };

        if (!Array.isArray(medias)) {
            return NextResponse.json({success: false, error: 'Missing medias'}, {status: 400});
        }

        for (const m of medias) {
            await saveMedia(volumeId, m.files, {
                media_no: m.media_no,
                media_type: m.media_type,
                content_title: m.content_title,
                description: m.description,
            });
        }

        deleteStaleMedias(
            volumeId,
            medias.map(m => ({media_no: m.media_no, media_type: m.media_type}))
        );

        return NextResponse.json({success: true});
    } catch (error) {
        return NextResponse.json(
            {success: false, error: error instanceof Error ? error.message : 'Unknown error'},
            {status: 500},
        );
    }
}
