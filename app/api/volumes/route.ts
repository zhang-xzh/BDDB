export const runtime = 'nodejs';

import {NextRequest, NextResponse} from 'next/server';
import {getAllVolumes, getAllTorrentsWithFiles, getVolumesByTorrent, saveVolume, deleteStaleVolumes, type Volume} from '@/lib/db';

interface VolumeWithFiles extends Volume {
    torrent_name?: string;
    files?: any[];
}

export async function GET(request: NextRequest) {
    try {
        const torrentId = request.nextUrl.searchParams.get('torrent_id');

        // DiscEditor: 按 torrent_id 查询该 torrent 的所有 volumes
        if (torrentId) {
            const volumes = await getVolumesByTorrent(torrentId);
            return NextResponse.json({success: true, data: JSON.stringify(volumes)});
        }

        // 全量列表：关联 torrent 名称和文件信息
        const [volumes, torrents] = await Promise.all([
            getAllVolumes(),
            getAllTorrentsWithFiles(),
        ]);

        // 以 torrent 内部 ID 为 key 建立索引（修正原先以 hash 为 key 的 Bug）
        const torrentMap = new Map<string, any>();
        const filesMap = new Map<string, any[]>();
        for (const t of torrents) {
            torrentMap.set(t.id!, t);
            if (t.files) filesMap.set(t.id!, t.files);
        }

        const result: VolumeWithFiles[] = volumes.map(v => {
            const torrent = torrentMap.get(v.torrent_id);
            const files = filesMap.get(v.torrent_id) ?? [];
            return {
                ...v,
                torrent_name: torrent?.name,
                files: files.filter((f: any) => v.torrent_file_ids.includes(f.id)),
            };
        });

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
                type?: 'volume' | 'box';
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
                type: v.type,
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
