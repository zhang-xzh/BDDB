export const runtime = 'nodejs';

import {NextRequest, NextResponse} from 'next/server';
import {getVolumesByTorrent, saveVolume, deleteStaleVolumes} from '@/lib/db';
import {getDb} from '@/lib/db/connection';

type VolumeRow = {
    id: string; torrent_id: string; volume_no: number;
    catalog_no: string; volume_name: string | null;
    is_deleted: number; updated_at: number;
};

export async function GET(request: NextRequest) {
    try {
        const torrentId = request.nextUrl.searchParams.get('torrent_id');

        // DiscEditor: 按 torrent_id 查询该 torrent 的所有 volumes
        if (torrentId) {
            const volumes = await getVolumesByTorrent(torrentId);
            return NextResponse.json({success: true, data: JSON.stringify(volumes)});
        }

        // 全量列表：只返回 volume 元数据，文件按需展开时单独查询
        const db = getDb();
        const volumeRows = db.prepare(
            'SELECT * FROM volumes WHERE is_deleted = 0 ORDER BY volume_no ASC'
        ).all() as VolumeRow[];

        const result = volumeRows.map(v => ({
            id: v.id,
            torrent_id: v.torrent_id,
            volume_no: v.volume_no,
            catalog_no: v.catalog_no,
            volume_name: v.volume_name ?? undefined,
            is_deleted: Boolean(v.is_deleted),
            updated_at: v.updated_at,
            torrent_file_ids: [] as string[],
        }));

        return NextResponse.json({success: true, data: JSON.stringify(result)});
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

        deleteStaleVolumes(torrent_id, volumes.map(v => v.volume_no));

        return NextResponse.json({success: true});
    } catch (error) {
        return NextResponse.json(
            {success: false, error: error instanceof Error ? error.message : 'Unknown error'},
            {status: 500},
        );
    }
}
