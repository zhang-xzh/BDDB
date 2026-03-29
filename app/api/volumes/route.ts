export const runtime = 'nodejs';

import {NextRequest, NextResponse} from 'next/server';
import {deleteStaleVolumes, getAllVolumes, getMediaCountsByVolume, getVolumesByTorrent, getWorkCountsByVolume, getVolumesWithPagination, saveVolumeCompat as saveVolume} from '@/lib/mongodb';

export async function GET(request: NextRequest) {
    try {
        const {searchParams} = request.nextUrl;
        const torrentId = searchParams.get('torrent_id');

        // torrent_id 查询保持向后兼容，返回所有关联卷
        if (torrentId) {
            let volumes = await getVolumesByTorrent(torrentId);
            // 默认按 catalog_no 排序
            volumes = volumes.sort((a, b) => (a.catalog_no || '').localeCompare(b.catalog_no || ''));
            const result = volumes.map(v => ({
                ...v,
                _id: v._id.toString(),
                torrent_id: v.torrent_id.toString(),
                file_ids: v.file_ids.map(id => id.toString()),
                work_ids: v.work_ids?.map(id => id.toString()) ?? [],
            }))
            return NextResponse.json({success: true, data: result});
        }

        // 检查是否需要分页
        const pageParam = searchParams.get('page');
        if (pageParam) {
            // 分页查询模式
            const page = parseInt(pageParam, 10) || 1;
            const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10) || 20;
            const searchCatalogNo = searchParams.get('searchCatalogNo') ?? undefined;
            const searchTitle = searchParams.get('searchTitle') ?? undefined;
            const filterHasWork = searchParams.get('filterHasWork') === 'true' ? true :
                searchParams.get('filterHasWork') === 'false' ? false : undefined;
            const filterHasMedia = searchParams.get('filterHasMedia') === 'true' ? true :
                searchParams.get('filterHasMedia') === 'false' ? false : undefined;

            const result = await getVolumesWithPagination({
                page,
                pageSize,
                searchCatalogNo,
                searchTitle,
                filterHasWork,
                filterHasMedia,
            });

            // 转换 ObjectId 为字符串
            const data = result.data.map(v => ({
                ...v,
                _id: v._id.toString(),
                torrent_id: v.torrent_id.toString(),
                file_ids: v.file_ids.map(id => id.toString()),
                work_ids: v.work_ids?.map(id => id.toString()) ?? [],
                workCount: (v.work_ids?.length ?? 0),
                mediaCount: (v as unknown as { mediaCount?: number }).mediaCount ?? 0,
            }));

            return NextResponse.json({
                success: true,
                data: {
                    data,
                    total: result.total,
                    page: result.page,
                    pageSize: result.pageSize,
                }
            });
        }

        // 全量查询模式（向后兼容）
        const [allVolumes, mediaCounts, workCounts] = await Promise.all([getAllVolumes(), getMediaCountsByVolume(), getWorkCountsByVolume()]);
        // 默认按 catalog_no 排序
        allVolumes.sort((a, b) => (a.catalog_no || '').localeCompare(b.catalog_no || ''));
        const result = allVolumes.map(v => {
            const id = v._id.toString()
            return {
                ...v,
                _id: id,
                torrent_id: v.torrent_id.toString(),
                file_ids: v.file_ids.map(id => id.toString()),
                work_ids: v.work_ids?.map(workId => workId.toString()) ?? [],
                mediaCount: mediaCounts.get(id) ?? 0,
                workCount: workCounts.get(id) ?? 0,
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
