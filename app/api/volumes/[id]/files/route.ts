export const runtime = 'nodejs';

import {NextRequest, NextResponse} from 'next/server';
import {getDb} from '@/lib/db/connection';

type FileRow = {
    id: string; name: string; size: number | null; progress: number | null;
};

function torrentRootPrefixLen(allNames: string[]): number {
    if (allNames.length === 0) return 0
    const firstParts = allNames[0].split('/')
    let len = 0
    for (let i = 1; i < firstParts.length; i++) {
        const prefix = firstParts.slice(0, i).join('/') + '/'
        if (allNames.every(n => n.startsWith(prefix))) len = i
        else break
    }
    return len
}

export async function GET(
    _request: NextRequest,
    {params}: {params: Promise<{id: string}>}
) {
    try {
        const {id} = await params;
        const db = getDb();

        // Get volume and its torrent_id together
        const vol = db.prepare(
            'SELECT id, torrent_id FROM volumes WHERE id = ? AND is_deleted = 0'
        ).get(id) as {id: string; torrent_id: string} | undefined;
        if (!vol) {
            return NextResponse.json({success: false, error: 'Volume not found'}, {status: 404});
        }

        // All torrent files to determine the true root prefix
        const allNames = (db.prepare(
            'SELECT name FROM torrent_files WHERE torrent_id = ? AND is_deleted = 0'
        ).all(vol.torrent_id) as {name: string}[]).map(r => r.name);

        const stripLen = torrentRootPrefixLen(allNames);

        // Volume files only
        const files = db.prepare<[string]>(`
            SELECT tf.id, tf.name, tf.size, tf.progress
            FROM torrent_files tf
            INNER JOIN volume_files vf ON vf.file_id = tf.id
            WHERE vf.volume_id = ? AND tf.is_deleted = 0
            ORDER BY tf.name ASC
        `).all(id) as FileRow[];

        const result = files.map(f => ({
            ...f,
            name: stripLen > 0
                ? f.name.split('/').slice(stripLen).join('/')
                : f.name,
        }));

        return NextResponse.json({success: true, data: JSON.stringify(result)});
    } catch (error) {
        return NextResponse.json(
            {success: false, error: error instanceof Error ? error.message : 'Unknown error'},
            {status: 500},
        );
    }
}
