export const runtime = 'nodejs';

import {NextRequest, NextResponse} from 'next/server';
import {getVolumesByTorrent, saveVolumeCompat as saveVolume, deleteStaleVolumes, getAllVolumes, getMediaCountsByVolume} from '@/lib/mongodb';

export async function GET(request: NextRequest) {
    try {
        const torrentId = request.nextUrl.searchParams.get('torrent_id');

        if (torrentId) {
            const volumes = await getVolumesByTorrent(torrentId);
            const result = volumes.map(v => ({
                ...v,
                _id: v._id.toString(),
                torrent_id: v.torrent_id.toString(),
                file_ids: v.file_ids.map(id => id.toString()),
            }))
            return NextResponse.json({success: true, data: result});
        }

        const [allVolumes, mediaCounts] = await Promise.all([getAllVolumes(), getMediaCountsByVolume()]);
        const result = allVolumes.map(v => {
            const id = v._id.toString()
            return {
                ...v,
                _id: id,
                torrent_id: v.torrent_id.toString(),
                file_ids: v.file_ids.map(id => id.toString()),
                mediaCount: mediaCounts.get(id) ?? 0,
            }
        });

        return NextResponse.json({success: true, data: result});
    } catch (error) {
        return NextResponse.json(
            {success: false, error: error instanceof Error ? error.message : 'Unknown error'},
            {status: 500},
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {torrent_id, volumes} = body as {
            torrent_id: string;
            volumes: Array<{
                volume_no: number;
                volume_name?: string;
                catalog_no: string;
                files: string[];
            }>;
        };

        if (!torrent_id || !Array.isArray(volumes)) {
            return NextResponse.json({success: false, error: 'Missing torrent_id or volumes'}, {status: 400});
        }

        for (const v of volumes) {
            await saveVolume(torrent_id, v.files, {
                volume_no: v.volume_no,
                catalog_no: v.catalog_no,
                volume_name: v.volume_name,
            });
        }

        await deleteStaleVolumes(torrent_id, volumes.map(v => v.volume_no));

        return NextResponse.json({success: true});
    } catch (error) {
        return NextResponse.json(
            {success: false, error: error instanceof Error ? error.message : 'Unknown error'},
            {status: 500},
        );
    }
}
