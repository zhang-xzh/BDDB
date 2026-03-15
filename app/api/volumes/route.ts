export const runtime = 'nodejs';

import {NextRequest, NextResponse} from 'next/server';
import {getVolumesByTorrent, saveVolumeCompat as saveVolume, deleteStaleVolumes, getAllVolumes, getAllVolumesWithWorks, getMediaCountsByVolume, getWorkCountsByVolume} from '@/lib/mongodb';

export async function GET(request: NextRequest) {
    try {
        const torrentId = request.nextUrl.searchParams.get('torrent_id');
        const withWorks = request.nextUrl.searchParams.get('with_works') === 'true';

        if (torrentId) {
            const volumes = await getVolumesByTorrent(torrentId);
            const result = volumes.map(v => ({
                ...v,
                _id: v._id.toString(),
                torrent_id: v.torrent_id.toString(),
                file_ids: v.file_ids.map(id => id.toString()),
                work_ids: v.work_ids?.map(id => id.toString()) ?? [],
            }))
            return NextResponse.json({success: true, data: result});
        }

        // 使用 MongoDB $lookup 在数据库层面关联查询 works
        if (withWorks) {
            const [volumesWithWorks, mediaCounts, workCounts] = await Promise.all([
                getAllVolumesWithWorks(),
                getMediaCountsByVolume(),
                getWorkCountsByVolume()
            ]);

            const result = volumesWithWorks.map(v => {
                const id = v._id.toString();
                return {
                    ...v,
                    _id: id,
                    torrent_id: v.torrent_id.toString(),
                    file_ids: v.file_ids.map(id => id.toString()),
                    work_ids: v.work_ids?.map(id => id.toString()) ?? [],
                    mediaCount: mediaCounts.get(id) ?? 0,
                    workCount: workCounts.get(id) ?? 0,
                    works: v.works?.map(w => ({
                        ...w,
                        _id: w._id.toString(),
                    })) ?? [],
                };
            });

            return NextResponse.json({success: true, data: result});
        }

        // 不关联 works 的原始查询
        const [allVolumes, mediaCounts, workCounts] = await Promise.all([
            getAllVolumes(),
            getMediaCountsByVolume(),
            getWorkCountsByVolume()
        ]);

        const result = allVolumes.map(v => {
            const id = v._id.toString();
            return {
                ...v,
                _id: id,
                torrent_id: v.torrent_id.toString(),
                file_ids: v.file_ids.map(id => id.toString()),
                work_ids: v.work_ids?.map(id => id.toString()) ?? [],
                mediaCount: mediaCounts.get(id) ?? 0,
                workCount: workCounts.get(id) ?? 0,
            };
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
