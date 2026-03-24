import {QBittorrent, TorrentFile as QbTorrentFile} from "@ctrl/qbittorrent";
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

        // 为所有种子获取文件信息（包括现有和新增）
        const allHashes = torrents.map(t => t.hash);
        const fileResults = await Promise.allSettled(
            allHashes.map(hash =>
                client.torrentFiles(hash).then(files => ({hash, files}))
            )
        );

        const fileMap = new Map<string, any[]>();
        for (const result of fileResults) {
            if (result.status === "fulfilled") {
                fileMap.set(result.value.hash, result.value.files);
            }
        }

        for (const t of torrents) {
            const existing = await getTorrentByHash(t.hash);
            const qbFiles = fileMap.get(t.hash) ?? [];
            
            if (existing) {
                // 将 qBittorrent 文件转换为 BddbTorrentFile 格式
                const files: BddbTorrentFile[] = qbFiles.map((f: QbTorrentFile) => {
                    // 尝试在现有文件中找到匹配的文件以保留 _id
                    const existingFile = existing.files.find(ef => ef.name === f.name);
                    return {
                        _id: existingFile?._id ?? new ObjectId(),
                        name: f.name,
                        size: f.size,
                        progress: f.progress,
                        priority: f.priority,
                        is_seed: f.is_seed,
                        piece_range: f.piece_range ?? [0, 0],
                        availability: f.availability,
                        created_at: existingFile?.created_at ?? ts,
                        updated_at: ts,
                    } as BddbTorrentFile;
                });

                // 更新所有来自 qBittorrent 的字段，保留 MongoDB 特有字段
                const updatedTorrent: BddbTorrent = {
                    ...existing,
                    ...t,
                    _id: existing._id,
                    is_deleted: existing.is_deleted,
                    created_at: existing.created_at,
                    updated_at: ts,
                    synced_at: ts,
                    files,
                    progress: t.progress != null ? t.progress * 100 : existing.progress,
                    completion_on: t.completion_on ?? undefined,
                    category: t.category || '',
                };
                updatedRecords.push(updatedTorrent);
            } else {
                newTorrents.push({hash: t.hash, qbTorrent: t, addedOn: t.added_on ?? ts, qbFiles});
            }
        }

        await Promise.all(updatedRecords.map(r => upsertTorrent(r)));

        if (newTorrents.length > 0) {
            await Promise.all(
                newTorrents.map(async ({hash, qbTorrent, addedOn, qbFiles}) => {
                    const files: BddbTorrentFile[] = qbFiles.map((f: QbTorrentFile) => ({
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