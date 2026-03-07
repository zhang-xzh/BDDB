import {QBittorrent} from "@ctrl/qbittorrent";
import {customAlphabet} from "nanoid";
import type {StoredFile, TorrentRecord} from "@/lib/db";
import {getTorrentByHash, upsertTorrent} from "@/lib/db";

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
const generateId = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 16);

export async function syncTorrentsFromQb() {
    const client = getQbClient();

    try {
        const torrents = await client.listTorrents();
        const ts = now();

        const newTorrents: any[] = [];
        const updatedRecords: TorrentRecord[] = [];

        for (const t of torrents) {
            const existing = await getTorrentByHash(t.hash);
            if (existing) {
                // Update flat QB fields in place
                existing.name = t.name;
                existing.size = t.size;
                existing.progress = t.progress != null ? t.progress * 100 : undefined;
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
                    const files: StoredFile[] = (fileMap.get(hash) ?? []).map(f => ({
                        id: generateId(),
                        is_deleted: false,
                        synced_at: ts,
                        name: f.name,
                        size: f.size,
                        progress: f.progress,
                        priority: f.priority,
                        is_seed: f.is_seed,
                        piece_range: f.piece_range ?? null,
                        availability: f.availability,
                    }));

                    const record: TorrentRecord = {
                        id: generateId(),
                        hash,
                        added_on: addedOn,
                        is_deleted: false,
                        synced_at: ts,
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
                    };

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