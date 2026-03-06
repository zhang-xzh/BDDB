import {QBittorrent} from "@ctrl/qbittorrent";
import {customAlphabet} from "nanoid";
import type {StoredFile, TorrentRecord} from "@/lib/db";
import {byHash, byId, ensureInit, fileIndex, writeTorrent} from "@/lib/db";

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
    await ensureInit();
    const client = getQbClient();

    try {
        const torrents = await client.listTorrents();
        const ts = now();

        const newTorrents: any[] = [];
        const updatedTorrents: TorrentRecord[] = [];

        for (const t of torrents) {
            const qbData = {
                hash: t.hash,
                name: t.name,
                size: t.size,
                progress: t.progress * 100,
                state: t.state,
                num_seeds: t.num_seeds,
                num_leechs: t.num_leechs,
                added_on: t.added_on,
                completion_on: t.completion_on,
                save_path: t.save_path,
                uploaded: t.uploaded,
                downloaded: t.downloaded,
                category: t.category || "",
            };

            const existing = byHash.get(t.hash);
            if (existing) {
                existing.qb_torrent = qbData as any;
                existing.synced_at = ts;
                updatedTorrents.push(existing);
            } else {
                newTorrents.push({hash: t.hash, qbData, addedOn: t.added_on ?? ts});
            }
        }

        // 批量写入已更新的 torrents
        await Promise.all(updatedTorrents.map((r) => writeTorrent(r)));

        // 新 torrents：并发拉取文件列表后写入
        if (newTorrents.length > 0) {
            const fileResults = await Promise.allSettled(
                newTorrents.map((t) =>
                    client.torrentFiles(t.hash).then((files) => ({hash: t.hash, files}))
                )
            );

            const fileMap = new Map<string, any[]>();
            for (const result of fileResults) {
                if (result.status === "fulfilled") {
                    fileMap.set(result.value.hash, result.value.files);
                }
            }

            await Promise.all(
                newTorrents.map(async (t) => {
                    const files: StoredFile[] = (fileMap.get(t.hash) ?? []).map((f) => {
                        const id = generateId();
                        return {id, qb_torrent_file: f, is_deleted: false, synced_at: ts};
                    });

                    const record: TorrentRecord = {
                        id: generateId(),
                        hash: t.hash,
                        added_on: t.addedOn,
                        qb_torrent: t.qbData,
                        is_deleted: false,
                        synced_at: ts,
                        files,
                    };

                    byHash.set(t.hash, record);
                    byId.set(record.id, record);
                    for (const f of files) fileIndex.set(f.id, t.hash);

                    await writeTorrent(record);
                })
            );
        }

        console.log(
            `Sync: new=${newTorrents.length}, updated=${updatedTorrents.length}`
        );
        return {
            success: true,
            newCount: newTorrents.length,
            updateCount: updatedTorrents.length,
        };
    } catch (error: any) {
        return {success: false, error: error.message};
    }
}