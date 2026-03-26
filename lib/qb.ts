import {QBittorrent} from "@ctrl/qbittorrent";
import type {Torrent, TorrentFile} from "@ctrl/qbittorrent/dist/src/types.js";
import type {BddbTorrent, BddbTorrentFile} from "@/lib/mongodb";
import {getTorrentByHash, upsertTorrent} from "@/lib/mongodb";
import {ObjectId} from "mongodb";

let qbClient: QBittorrent | null = null;

export function getQbClient(): QBittorrent {
    if (!qbClient) {
        const host = process.env.QB_HOST || "localhost:18000";
        qbClient = new QBittorrent({
            baseUrl: host.startsWith("http") ? host : `http://${host}`,
        });
    }
    return qbClient;
}

const now = (): number => Math.floor(Date.now() / 1000);

interface SyncResult {
    success: boolean;
    newCount?: number;
    updateCount?: number;
    total?: number;
    error?: string;
}


export async function syncTorrentsFromQb(): Promise<SyncResult> {
    const client = getQbClient();

    try {
        console.log(`[syncTorrentsFromQb] Step 1: Fetching torrent list...`);
        const torrents: Torrent[] = await client.listTorrents();
        console.log(`[syncTorrentsFromQb] Fetched ${torrents.length} torrents`);

        const ts = now();

        // 1. 批量获取所有种子的文件列表（带延迟避免请求过快）
        console.log(`[syncTorrentsFromQb] Step 2: Fetching files for each torrent...`);
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        const qbFileMap = new Map<string, TorrentFile[]>();
        let failedFileCount = 0;

        // 串行获取，避免并发过高
        for (let i = 0; i < torrents.length; i++) {
            const t = torrents[i];
            console.log(`[syncTorrentsFromQb] [${i + 1}/${torrents.length}] Fetching files for hash=${t.hash}, name="${t.name}"`);
            try {
                const files = await client.torrentFiles(t.hash);
                console.log(`[syncTorrentsFromQb] [${i + 1}/${torrents.length}] Got ${files.length} files`);
                qbFileMap.set(t.hash, files);
                // 每 10 个请求后延迟 100ms
                if (i % 10 === 0 && i > 0) {
                    console.log(`[syncTorrentsFromQb] Delaying 100ms...`);
                    await delay(100);
                }
            } catch (error: any) {
                failedFileCount++;
                console.error(`[syncTorrentsFromQb] [${i + 1}/${torrents.length}] FAILED to get files for ${t.hash}: ${error.message}`);
            }
        }
        console.log(`[syncTorrentsFromQb] Step 2 complete. Success: ${qbFileMap.size}, Failed: ${failedFileCount}`);

        console.log(`[syncTorrentsFromQb] Step 3: Syncing to database...`);
        let newCount = 0;
        let updateCount = 0;

        for (let i = 0; i < torrents.length; i++) {
            const t = torrents[i];
            const qbFiles: TorrentFile[] = qbFileMap.get(t.hash) ?? [];
            console.log(`[syncTorrentsFromQb] [${i + 1}/${torrents.length}] Processing hash=${t.hash}, name="${t.name}", qbFiles=${qbFiles.length}`);

            const existing: BddbTorrent | null = await getTorrentByHash(t.hash);
            console.log(`[syncTorrentsFromQb] [${i + 1}/${torrents.length}] DB lookup: ${existing ? 'FOUND (update)' : 'NOT FOUND (new)'}`);

            if (existing) {
                // 更新现有种子基本信息（严格维持 API 返回值）
                console.log(`[syncTorrentsFromQb] [${i + 1}/${torrents.length}] Updating torrent fields: ${Object.keys(t).join(', ')}`);
                Object.assign(existing, t);
                existing.synced_at = ts;
                existing.updated_at = ts;

                // 2. 以名字对比 files，更新每一项（仅当成功获取到 files 时）
                if (qbFiles.length > 0) {
                    console.log(`[syncTorrentsFromQb] [${i + 1}/${torrents.length}] Processing ${qbFiles.length} files...`);
                    const existingFiles: BddbTorrentFile[] = existing.files ?? [];
                    console.log(`[syncTorrentsFromQb] [${i + 1}/${torrents.length}] Existing files in DB: ${existingFiles.length}`);
                    const updatedFiles: BddbTorrentFile[] = [];

                    for (let j = 0; j < qbFiles.length; j++) {
                        const qbFile = qbFiles[j];
                        console.log(`[syncTorrentsFromQb] [${i + 1}/${torrents.length}] [File ${j + 1}/${qbFiles.length}] name="${qbFile.name}", size=${qbFile.size}`);

                        // 按名字查找现有文件
                        const existingFile: BddbTorrentFile | undefined = existingFiles.find(
                            (f: BddbTorrentFile) => f.name === qbFile.name
                        );

                        if (existingFile) {
                            console.log(`[syncTorrentsFromQb] [${i + 1}/${torrents.length}] [File ${j + 1}/${qbFiles.length}] MATCHED existing file, updating`);
                            // 更新现有文件
                            Object.assign(existingFile, qbFile, {
                                updated_at: ts,
                            });
                            updatedFiles.push(existingFile);
                        } else {
                            console.log(`[syncTorrentsFromQb] [${i + 1}/${torrents.length}] [File ${j + 1}/${qbFiles.length}] NEW file, creating`);
                            // 新增文件
                            const newFile: BddbTorrentFile = {
                                ...qbFile,
                                _id: new ObjectId(),
                                created_at: ts,
                                updated_at: ts,
                            } as BddbTorrentFile;
                            updatedFiles.push(newFile);
                        }
                    }

                    console.log(`[syncTorrentsFromQb] [${i + 1}/${torrents.length}] Files summary: ${updatedFiles.length} total (updated + new)`);
                    // 处理 qbt 中已删除的文件（保留在 DB 中但标记为删除，或根据需要删除）
                    existing.files = updatedFiles;
                } else {
                    console.log(`[syncTorrentsFromQb] [${i + 1}/${torrents.length}] Skipping file update (qbFiles is empty)`);
                }

                console.log(`[syncTorrentsFromQb] [${i + 1}/${torrents.length}] Saving to DB...`);
                await upsertTorrent(existing);
                updateCount++;
                console.log(`[syncTorrentsFromQb] [${i + 1}/${torrents.length}] UPDATE complete`);
            } else {
                // 新建种子
                console.log(`[syncTorrentsFromQb] [${i + 1}/${torrents.length}] Creating new torrent with ${qbFiles.length} files`);
                const files: BddbTorrentFile[] = qbFiles.map((f: TorrentFile, idx: number) => {
                    console.log(`[syncTorrentsFromQb] [${i + 1}/${torrents.length}] [File ${idx + 1}/${qbFiles.length}] Adding file: name="${f.name}", size=${f.size}`);
                    return {
                        ...f,
                        _id: new ObjectId(),
                        created_at: ts,
                        updated_at: ts,
                    } as BddbTorrentFile;
                });

                const record: BddbTorrent = {
                    ...(t as unknown as BddbTorrent),
                    _id: new ObjectId(),
                    is_deleted: false,
                    synced_at: ts,
                    created_at: ts,
                    updated_at: ts,
                    files,
                };

                console.log(`[syncTorrentsFromQb] [${i + 1}/${torrents.length}] Saving new torrent to DB...`);
                await upsertTorrent(record);
                newCount++;
                console.log(`[syncTorrentsFromQb] [${i + 1}/${torrents.length}] NEW torrent complete`);
            }
        }

        console.log(`[syncTorrentsFromQb] ========================================`);
        console.log(`[syncTorrentsFromQb] Sync complete: new=${newCount}, updated=${updateCount}, total=${torrents.length}`);
        console.log(`[syncTorrentsFromQb] ========================================`);
        return {success: true, newCount, updateCount, total: torrents.length};
    } catch (error: any) {
        console.error(`[syncTorrentsFromQb] FATAL ERROR: ${error.message}`);
        return {success: false, error: error.message};
    }
}
