import {QBittorrent} from "@ctrl/qbittorrent";
import type {BddbTorrent, BddbTorrentFile} from "@/lib/mongodb";
import {getTorrentByHash, upsertTorrent} from "@/lib/mongodb";
import {ObjectId} from "mongodb";

let qbClient: QBittorrent | null = null;

export function getQbClient() {
    if (!qbClient) {
        const host = process.env.QB_HOST || "localhost:18000";
        qbClient = new QBittorrent({
            baseUrl: host.startsWith("http") ? host : `http://${host}`,
        });
    }
    return qbClient;
}

const now = () => Math.floor(Date.now() / 1000);

export async function syncTorrentsFromQb() {
    const client = getQbClient();

    try {
        const torrents = await client.listTorrents();
        const ts = now();

        const newTorrents: any[] = [];
        const updatedRecords: BddbTorrent[] = [];

        for (const t of torrents) {
            const existing = await getTorrentByHash(t.hash);
            if (existing) {
                existing.name = t.name;
                existing.size = t.size;
                existing.progress = t.progress != null ? t.progress * 100 : existing.progress;
                existing.state = t.state;
                existing.num_seeds = t.num_seeds;
                existing.num_leechs = t.num_leechs;
                existing.completion_on = t.completion_on ?? undefined;
                existing.save_path = t.save_path;
                existing.uploaded = t.uploaded;
                existing.downloaded = t.downloaded;
                existing.category = t.category || '';
                existing.synced_at = ts;
                updatedRecords.push(existing);
            } else {
                newTorrents.push({hash: t.hash, qbTorrent: t, addedOn: t.added_on ?? ts});
            }
        }

        await Promise.all(updatedRecords.map(r => upsertTorrent(r)));

        if (newTorrents.length > 0) {
            const fileResults = await Promise.allSettled(
                newTorrents.map(t =>
                    client.torrentFiles(t.hash).then(files => ({hash: t.hash, files}))
                )
            );

            const fileMap = new Map<string, any[]>();
            for (const result of fileResults) {
                if (result.status === "fulfilled") {
                    fileMap.set(result.value.hash, result.value.files);
                }
            }

            await Promise.all(
                newTorrents.map(async ({hash, qbTorrent, addedOn}) => {
                    const files: BddbTorrentFile[] = (fileMap.get(hash) ?? []).map(f => ({
                        _id: new ObjectId(),
                        name: f.name,
                        size: f.size,
                        progress: f.progress,
                        priority: f.priority,
                        is_seed: f.is_seed,
                        piece_range: f.piece_range ?? [0, 0],
                        availability: f.availability,
                        created_at: ts,
                        updated_at: ts,
                    } as BddbTorrentFile));

                    const record = {
                        _id: new ObjectId(),
                        hash,
                        added_on: addedOn,
                        is_deleted: false,
                        synced_at: ts,
                        created_at: ts,
                        updated_at: ts,
                        name: qbTorrent.name,
                        size: qbTorrent.size,
                        progress: qbTorrent.progress != null ? qbTorrent.progress * 100 : undefined,
                        state: qbTorrent.state,
                        num_seeds: qbTorrent.num_seeds,
                        num_leechs: qbTorrent.num_leechs,
                        completion_on: qbTorrent.completion_on ?? undefined,
                        save_path: qbTorrent.save_path,
                        uploaded: qbTorrent.uploaded,
                        downloaded: qbTorrent.downloaded,
                        category: qbTorrent.category || '',
                        files,
                    } as BddbTorrent;

                    await upsertTorrent(record);
                })
            );
        }

        console.log(`Sync: new=${newTorrents.length}, updated=${updatedRecords.length}`);
        return {success: true, newCount: newTorrents.length, updateCount: updatedRecords.length};
    } catch (error: any) {
        return {success: false, error: error.message};
    }
}