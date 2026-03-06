export const runtime = 'nodejs';

import {getAllVolumes, getAllTorrentsWithFiles, type Volume} from '@/lib/db';
import {NextResponse} from 'next/server';

interface VolumeWithFiles extends Volume {
    torrent_name?: string;
    files?: any[];
}

export async function GET() {
    try {
        const [volumes, torrents] = await Promise.all([
            getAllVolumes(),
            getAllTorrentsWithFiles()
        ]);

        // Build torrent map for quick lookup
        const torrentMap = new Map<string, any>();
        for (const t of torrents) {
            torrentMap.set(t.qb_torrent.hash, t.qb_torrent);
        }

        // Build files map for each torrent
        const filesMap = new Map<string, any[]>();
        for (const t of torrents) {
            if (t.files) {
                filesMap.set(t.qb_torrent.hash, t.files);
            }
        }

        const result: VolumeWithFiles[] = volumes.map(v => {
            const torrent = torrentMap.get(v.torrent_id);
            const files = filesMap.get(v.torrent_id) || [];
            
            // Filter files that belong to this volume
            const volumeFiles = files.filter(f => v.torrent_file_ids.includes(f.id));
            
            return {
                ...v,
                torrent_name: torrent?.name,
                files: volumeFiles
            };
        });

        return NextResponse.json({
            success: true,
            data: JSON.stringify(result),
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        }, {status: 500});
    }
}
