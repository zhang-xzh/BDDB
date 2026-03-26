import {MongoClient, ObjectId} from 'mongodb';

// MongoDB 连接配置
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'bddb_prod';

interface TorrentFile {
    _id: ObjectId;
    [key: string]: any;
}

interface Torrent {
    _id: ObjectId;
    name?: string;
    files?: TorrentFile[];
    [key: string]: any;
}

interface Volume {
    _id: ObjectId;
    torrent_id?: ObjectId;
    volume_name?: string;
    file_ids?: ObjectId[];
    [key: string]: any;
}

async function main() {
    const client = new MongoClient(MONGO_URI);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(DB_NAME);
        const torrentsCollection = db.collection<Torrent>('bddb_torrents');
        const volumesCollection = db.collection<Volume>('bddb_volumes');

        // 查询所有数据
        console.log('Fetching all torrents and volumes...');
        const torrents = await torrentsCollection.find({}).toArray();
        const volumes = await volumesCollection.find({}).toArray();

        console.log(`Total torrents: ${torrents.length}`);
        console.log(`Total volumes: ${volumes.length}`);

        // 建立 torrent_id -> torrent name 的映射
        const torrentMap = new Map<string, { name: string }>();
        for (const torrent of torrents) {
            const torrentId = torrent._id?.toString();
            if (torrentId) {
                torrentMap.set(torrentId, {name: torrent.name || 'unnamed'});
            }
        }

        // 建立 file_id -> torrent_id 的映射
        const fileToTorrentMap = new Map<string, string>();
        for (const torrent of torrents) {
            const torrentId = torrent._id?.toString();
            if (!torrentId) continue;

            if (torrent.files && Array.isArray(torrent.files)) {
                for (const file of torrent.files) {
                    if (file._id) {
                        fileToTorrentMap.set(file._id.toString(), torrentId);
                    }
                }
            }
        }

        console.log(`Total unique file IDs in torrents: ${fileToTorrentMap.size}`);

        // 检查并收集受影响的 volumes
        const affectedVolumeIds: ObjectId[] = [];
        const affectedVolumeDetails: Array<{
            volumeId: string;
            volumeName: string;
            torrentId: string;
            torrentName: string;
            missingCount: number;
            totalFiles: number;
        }> = [];

        for (const volume of volumes) {
            if (volume.file_ids && Array.isArray(volume.file_ids) && volume.file_ids.length > 0) {
                const volumeId = volume._id?.toString() || 'unknown';
                const volumeName = volume.volume_name || 'unknown';
                const torrentId = volume.torrent_id?.toString() || 'unknown';
                const torrentInfo = torrentMap.get(torrentId);
                const torrentName = torrentInfo?.name || 'unknown';
                const totalFiles = volume.file_ids.length;

                let missingCount = 0;

                for (const fileId of volume.file_ids) {
                    const fileIdStr = fileId.toString();
                    if (!fileToTorrentMap.has(fileIdStr)) {
                        missingCount++;
                    }
                }

                if (missingCount > 0) {
                    affectedVolumeIds.push(volume._id);
                    affectedVolumeDetails.push({
                        volumeId,
                        volumeName,
                        torrentId,
                        torrentName,
                        missingCount,
                        totalFiles
                    });
                }
            }
        }

        // 输出检查结果
        console.log('\n========== 检查结果 ==========');

        if (affectedVolumeIds.length === 0) {
            console.log('✓ 没有发现受影响的 volumes，无需删除');
            return;
        }

        console.log(`发现 ${affectedVolumeDetails.length} 个受影响的 volume:\n`);

        for (const issue of affectedVolumeDetails) {
            const percentage = ((issue.missingCount / issue.totalFiles) * 100).toFixed(1);
            console.log(`  torrent_id: ${issue.torrentId}`);
            console.log(`  torrent_name: ${issue.torrentName}`);
            console.log(`  volume_name: ${issue.volumeName}`);
            console.log(`  缺失: ${issue.missingCount}/${issue.totalFiles} (${percentage}%)`);
            console.log(`  volume_id: ${issue.volumeId}\n`);
        }

        // 统计信息
        const totalMissingFiles = affectedVolumeDetails.reduce((sum, v) => sum + v.missingCount, 0);
        const affectedTorrentsSet = new Set(affectedVolumeDetails.map(v => v.torrentId));

        console.log(`========== 统计 ==========`);
        console.log(`受影响的 Volumes: ${affectedVolumeDetails.length} 个`);
        console.log(`受影响的 Torrents: ${affectedTorrentsSet.size} 个`);
        console.log(`总共缺失的文件引用: ${totalMissingFiles} 个`);

        // 执行删除
        console.log(`\n========== 删除操作 ==========`);
        console.log(`正在删除 ${affectedVolumeIds.length} 个受影响的 volumes...`);

        const deleteResult = await volumesCollection.deleteMany({
            _id: { $in: affectedVolumeIds }
        });

        console.log(`✓ 删除完成`);
        console.log(`  删除数量: ${deleteResult.deletedCount}`);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    } finally {
        await client.close();
        console.log('\nDisconnected from MongoDB');
    }
}

main();
