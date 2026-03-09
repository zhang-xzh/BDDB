import {getMongoCollection} from './connection'
import type {Collection, Filter} from 'mongodb'
import {ObjectId} from 'mongodb'
import type {Torrent as QbTorrent, TorrentFile as QbTorrentFile,} from "@ctrl/qbittorrent";

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

export interface BddbTorrentFile extends QbTorrentFile {
    _id: ObjectId
    created_at: number
    updated_at: number
}

export interface BddbTorrent extends QbTorrent {
    _id: ObjectId
    is_deleted: boolean
    synced_at: number
    created_at: number
    updated_at: number
    files: BddbTorrentFile[]
}

export interface BddbVolume {
    _id: ObjectId
    torrent_id: ObjectId
    volume_no: number
    catalog_no: string
    volume_name?: string
    is_deleted: boolean
    created_at: number
    updated_at: number
    file_ids: ObjectId[]
}

export type MediaType = 'bd' | 'dvd' | 'cd' | 'scan'

export interface BddbMedia {
    _id: ObjectId
    volume_id: ObjectId
    media_no: number
    media_type: MediaType
    volume_no?: number
    catalog_no?: string
    content_title?: string
    description?: string
    is_deleted: boolean
    created_at: number
    updated_at: number
    file_ids: ObjectId[]
}

// 前端序列化类型（ObjectId -> string）
export interface TorrentWithVolume {
    _id: string
    hash: string
    name?: string
    added_on?: number
    is_deleted: boolean
    synced_at: number
    size?: number
    progress?: number
    state?: string
    num_seeds?: number
    num_leechs?: number
    completion_on?: number
    save_path?: string
    uploaded?: number
    downloaded?: number
    category?: string
    tags?: string
    content_path?: string
    hasVolumes?: boolean
    volumeCount?: number
}

export interface Volume {
    _id: string
    torrent_id: string
    volume_no: number
    catalog_no: string
    volume_name?: string
    is_deleted: boolean
    updated_at: number
    file_ids: string[]
}

export interface Media {
    _id: string
    volume_id: string
    media_no: number
    media_type: MediaType
    content_title?: string
    description?: string
    is_deleted: boolean
    updated_at: number
    file_ids: string[]
}

export interface VolumeForm {
    catalog_no: string
    volume_name: string
    type?: 'volume' | 'box'
    media_type?: 'BD' | 'DVD'
}

export interface MediaForm {
    media_type: MediaType
    content_title: string
    description: string
}

export interface NodeData {
    volume_no?: number
    shared_volume_nos?: number[]
    files?: string[]

    media_no?: number
    media_type?: MediaType
    shared_medias?: number[]
}

export interface FileItem {
    id?: string
    name: string
    size: number
    progress: number
}

// ─── 集合获取 ─────────────────────────────────────────────────────────────────

function getTorrentsCollection(): Collection<BddbTorrent> {
    return getMongoCollection<BddbTorrent>('bddb_torrents')
}

function getVolumesCollection(): Collection<BddbVolume> {
    return getMongoCollection<BddbVolume>('bddb_volumes')
}

function getMediasCollection(): Collection<BddbMedia> {
    return getMongoCollection<BddbMedia>('bddb_medias')
}

// ─── 种子相关 ─────────────────────────────────────────────────────────────────

/**
 * 获取所有种子（包含软删除）
 */
export async function getAllTorrents(includeDeleted = false): Promise<BddbTorrent[]> {
    try {
        const collection = getTorrentsCollection()
        const filter: Filter<BddbTorrent> = includeDeleted ? {} : {is_deleted: false}
        return await collection.find(filter, {projection: {files: 0}}).sort({added_on: -1}).toArray() as BddbTorrent[]
    } catch (error) {
        console.error('[mongodb] getAllTorrents error:', error)
        return []
    }
}

/**
 * 根据 hash 获取种子（不包含软删除）
 */
export async function getTorrentByHash(hash: string): Promise<BddbTorrent | null> {
    try {
        const collection = getTorrentsCollection()
        const torrent = await collection.findOne({
            hash,
            is_deleted: false,
        })
        return torrent || null
    } catch (error) {
        console.error('[mongodb] getTorrentByHash error:', error)
        return null
    }
}

/**
 * 根据 ID 获取种子（包含软删除）
 */
export async function getTorrentById(id: string | ObjectId): Promise<BddbTorrent | null> {
    try {
        const collection = getTorrentsCollection()
        const torrent = await collection.findOne({
            _id: typeof id === 'string' ? new ObjectId(id) : id,
        })
        return torrent || null
    } catch (error) {
        console.error('[mongodb] getTorrentById error:', error)
        return null
    }
}

/**
 * 根据 ID 获取种子（不包含软删除）
 */
export async function getActiveTorrentById(id: string | ObjectId): Promise<BddbTorrent | null> {
    try {
        const collection = getTorrentsCollection()
        const torrent = await collection.findOne({
            _id: typeof id === 'string' ? new ObjectId(id) : id,
            is_deleted: false,
        })
        return torrent || null
    } catch (error) {
        console.error('[mongodb] getActiveTorrentById error:', error)
        return null
    }
}

/**
 * 创建或更新种子
 */
export async function upsertTorrent(torrent: BddbTorrent): Promise<void> {
    try {
        const collection = getTorrentsCollection()
        const now = Math.floor(Date.now() / 1000)

        await collection.updateOne(
            {hash: torrent.hash},
            {
                $set: {
                    ...torrent,
                    updated_at: now,
                    created_at: torrent.created_at || now,
                },
            },
            {upsert: true}
        )
    } catch (error) {
        console.error('[mongodb] upsertTorrent error:', error)
        throw error
    }
}

/**
 * 批量创建或更新种子
 */
export async function upsertTorrents(torrents: BddbTorrent[]): Promise<void> {
    try {
        const collection = getTorrentsCollection()
        const now = Math.floor(Date.now() / 1000)

        const operations = torrents.map(torrent => ({
            updateOne: {
                filter: {hash: torrent.hash},
                update: {
                    $set: {
                        ...torrent,
                        updated_at: now,
                        created_at: torrent.created_at || now,
                    },
                },
                upsert: true,
            },
        }))

        if (operations.length > 0) {
            await collection.bulkWrite(operations, {ordered: false})
        }
    } catch (error) {
        console.error('[mongodb] upsertTorrents error:', error)
        throw error
    }
}

/**
 * 软删除种子
 */
export async function softDeleteTorrent(hash: string): Promise<void> {
    try {
        const collection = getTorrentsCollection()
        const now = Math.floor(Date.now() / 1000)
        await collection.updateOne(
            {hash},
            {$set: {is_deleted: true, synced_at: now, updated_at: now}}
        )
    } catch (error) {
        console.error('[mongodb] softDeleteTorrent error:', error)
        throw error
    }
}

/**
 * 硬删除种子
 */
export async function deleteTorrent(hash: string): Promise<void> {
    try {
        const collection = getTorrentsCollection()
        await collection.deleteOne({hash})
    } catch (error) {
        console.error('[mongodb] deleteTorrent error:', error)
        throw error
    }
}

/**
 * 获取种子数量
 */
export async function getTorrentCount(includeDeleted = false): Promise<number> {
    try {
        const collection = getTorrentsCollection()
        const filter: Filter<BddbTorrent> = includeDeleted ? {} : {is_deleted: false}
        return await collection.countDocuments(filter)
    } catch (error) {
        console.error('[mongodb] getTorrentCount error:', error)
        return 0
    }
}

// ─── 卷相关 ───────────────────────────────────────────────────────────────────

/**
 * 根据 torrent_id 获取卷列表（不包含软删除）
 */
export async function getVolumesByTorrentId(torrentId: string | ObjectId): Promise<BddbVolume[]> {
    try {
        const collection = getVolumesCollection()
        const filter: Filter<BddbVolume> = {
            torrent_id: typeof torrentId === 'string' ? new ObjectId(torrentId) : torrentId,
            is_deleted: false,
        }
        return await collection.find(filter).sort({volume_no: 1}).toArray()
    } catch (error) {
        console.error('[mongodb] getVolumesByTorrentId error:', error)
        return []
    }
}

/**
 * 根据文件 ID 获取卷列表（不包含软删除）
 */
export async function getVolumesByFileId(fileId: string | ObjectId): Promise<BddbVolume[]> {
    try {
        const collection = getVolumesCollection()
        const filter: Filter<BddbVolume> = {
            file_ids: typeof fileId === 'string' ? new ObjectId(fileId) : fileId,
            is_deleted: false,
        }
        return await collection.find(filter).sort({volume_no: 1}).toArray()
    } catch (error) {
        console.error('[mongodb] getVolumesByFileId error:', error)
        return []
    }
}

/**
 * 获取所有卷（不包含软删除）
 */
export async function getAllVolumes(torrentId?: string | ObjectId): Promise<BddbVolume[]> {
    try {
        const collection = getVolumesCollection()
        let filter: Filter<BddbVolume> = {is_deleted: false}

        if (torrentId) {
            filter = {
                ...filter,
                torrent_id: typeof torrentId === 'string' ? new ObjectId(torrentId) : torrentId,
            }
        }

        return await collection.find(filter).sort({volume_no: 1}).toArray()
    } catch (error) {
        console.error('[mongodb] getAllVolumes error:', error)
        return []
    }
}

/**
 * 保存卷
 */
export async function saveVolume(volume: BddbVolume): Promise<void> {
    try {
        const collection = getVolumesCollection()
        const now = Math.floor(Date.now() / 1000)

        // 先删除同 torrent_id + volume_no 的旧记录
        await collection.deleteOne({
            torrent_id: volume.torrent_id,
            volume_no: volume.volume_no,
        })

        await collection.insertOne({
            ...volume,
            created_at: volume.created_at || now,
            updated_at: now,
        })
    } catch (error) {
        console.error('[mongodb] saveVolume error:', error)
        throw error
    }
}

/**
 * 批量保存卷
 */
export async function saveVolumes(volumes: BddbVolume[]): Promise<void> {
    try {
        const collection = getVolumesCollection()
        const now = Math.floor(Date.now() / 1000)

        const operations = volumes.map(volume => ({
            updateOne: {
                filter: {
                    torrent_id: volume.torrent_id,
                    volume_no: volume.volume_no,
                },
                update: {
                    $set: {
                        ...volume,
                        updated_at: now,
                        created_at: volume.created_at || now,
                    },
                },
                upsert: true,
            },
        }))

        if (operations.length > 0) {
            await collection.bulkWrite(operations, {ordered: false})
        }
    } catch (error) {
        console.error('[mongodb] saveVolumes error:', error)
        throw error
    }
}

/**
 * 软删除卷
 */
export async function softDeleteVolume(id: string | ObjectId): Promise<void> {
    try {
        const collection = getVolumesCollection()
        const now = Math.floor(Date.now() / 1000)
        await collection.updateOne(
            {_id: typeof id === 'string' ? new ObjectId(id) : id},
            {$set: {is_deleted: true, updated_at: now}}
        )
    } catch (error) {
        console.error('[mongodb] softDeleteVolume error:', error)
        throw error
    }
}

/**
 * 删除卷
 */
export async function deleteVolume(id: string | ObjectId): Promise<void> {
    try {
        const collection = getVolumesCollection()
        await collection.deleteOne({_id: typeof id === 'string' ? new ObjectId(id) : id})
    } catch (error) {
        console.error('[mongodb] deleteVolume error:', error)
        throw error
    }
}

/**
 * 获取卷数量
 */
export async function getVolumeCount(torrentId?: string | ObjectId): Promise<number> {
    try {
        const collection = getVolumesCollection()
        let filter: Filter<BddbVolume> = {is_deleted: false}

        if (torrentId) {
            filter = {
                ...filter,
                torrent_id: typeof torrentId === 'string' ? new ObjectId(torrentId) : torrentId,
            }
        }

        return await collection.countDocuments(filter)
    } catch (error) {
        console.error('[mongodb] getVolumeCount error:', error)
        return 0
    }
}

/**
 * 获取每个 torrent_id 的卷数量统计
 */
export async function getVolumeCounts(): Promise<Map<string, number>> {
    try {
        const collection = getVolumesCollection()
        const result = await collection.aggregate([
            {$match: {is_deleted: false}},
            {$group: {_id: '$torrent_id', count: {$sum: 1}}},
        ]).toArray()

        const counts = new Map<string, number>()
        for (const item of result) {
            counts.set(item._id.toString(), item.count)
        }
        return counts
    } catch (error) {
        console.error('[mongodb] getVolumeCounts error:', error)
        return new Map()
    }
}

// ─── 媒体相关 ─────────────────────────────────────────────────────────────────

/**
 * 获取所有 volume 的媒体数量（聚合，用于列表页）
 */
export async function getMediaCountsByVolume(): Promise<Map<string, number>> {
    try {
        const collection = getMediasCollection()
        const result = await collection.aggregate([
            {$match: {is_deleted: false}},
            {$group: {_id: '$volume_id', count: {$sum: 1}}},
        ]).toArray()
        const counts = new Map<string, number>()
        for (const item of result) {
            counts.set(item._id.toString(), item.count)
        }
        return counts
    } catch (error) {
        console.error('[mongodb] getMediaCountsByVolume error:', error)
        return new Map()
    }
}

/**
 * 根据 volume_id 获取媒体列表（不包含软删除）
 */
export async function getMediasByVolumeId(volumeId: string | ObjectId): Promise<BddbMedia[]> {
    try {
        const collection = getMediasCollection()
        const filter: Filter<BddbMedia> = {
            volume_id: typeof volumeId === 'string' ? new ObjectId(volumeId) : volumeId,
            is_deleted: false,
        }
        return await collection.find(filter).sort({media_no: 1}).toArray()
    } catch (error) {
        console.error('[mongodb] getMediasByVolumeId error:', error)
        return []
    }
}

/**
 * 根据文件 ID 获取媒体列表（不包含软删除）
 */
export async function getMediasByFileId(fileId: string | ObjectId): Promise<BddbMedia[]> {
    try {
        const collection = getMediasCollection()
        const filter: Filter<BddbMedia> = {
            file_ids: typeof fileId === 'string' ? new ObjectId(fileId) : fileId,
            is_deleted: false,
        }
        return await collection.find(filter).sort({media_no: 1}).toArray()
    } catch (error) {
        console.error('[mongodb] getMediasByFileId error:', error)
        return []
    }
}

/**
 * 获取所有媒体（不包含软删除）
 */
export async function getAllMedias(volumeId?: string | ObjectId): Promise<BddbMedia[]> {
    try {
        const collection = getMediasCollection()
        let filter: Filter<BddbMedia> = {is_deleted: false}

        if (volumeId) {
            filter = {
                ...filter,
                volume_id: typeof volumeId === 'string' ? new ObjectId(volumeId) : volumeId,
            }
        }

        return await collection.find(filter).sort({media_no: 1}).toArray()
    } catch (error) {
        console.error('[mongodb] getAllMedias error:', error)
        return []
    }
}

/**
 * 保存媒体
 */
export async function saveMedia(media: BddbMedia): Promise<void> {
    try {
        const collection = getMediasCollection()
        const now = Math.floor(Date.now() / 1000)

        // 先删除同 volume_id + media_no + media_type 的旧记录
        await collection.deleteOne({
            volume_id: media.volume_id,
            media_no: media.media_no,
            media_type: media.media_type,
        })

        await collection.insertOne({
            ...media,
            created_at: media.created_at || now,
            updated_at: now,
        })
    } catch (error) {
        console.error('[mongodb] saveMedia error:', error)
        throw error
    }
}

/**
 * 批量保存媒体
 */
export async function saveMedias(medias: BddbMedia[]): Promise<void> {
    try {
        const collection = getMediasCollection()
        const now = Math.floor(Date.now() / 1000)

        const operations = medias.map(media => ({
            updateOne: {
                filter: {
                    volume_id: media.volume_id,
                    media_no: media.media_no,
                    media_type: media.media_type,
                },
                update: {
                    $set: {
                        ...media,
                        updated_at: now,
                        created_at: media.created_at || now,
                    },
                },
                upsert: true,
            },
        }))

        if (operations.length > 0) {
            await collection.bulkWrite(operations, {ordered: false})
        }
    } catch (error) {
        console.error('[mongodb] saveMedias error:', error)
        throw error
    }
}

/**
 * 软删除媒体
 */
export async function softDeleteMedia(id: string | ObjectId): Promise<void> {
    try {
        const collection = getMediasCollection()
        const now = Math.floor(Date.now() / 1000)
        await collection.updateOne(
            {_id: typeof id === 'string' ? new ObjectId(id) : id},
            {$set: {is_deleted: true, updated_at: now}}
        )
    } catch (error) {
        console.error('[mongodb] softDeleteMedia error:', error)
        throw error
    }
}

/**
 * 删除媒体
 */
export async function deleteMedia(id: string | ObjectId): Promise<void> {
    try {
        const collection = getMediasCollection()
        await collection.deleteOne({_id: typeof id === 'string' ? new ObjectId(id) : id})
    } catch (error) {
        console.error('[mongodb] deleteMedia error:', error)
        throw error
    }
}

/**
 * 获取媒体数量
 */
export async function getMediaCount(volumeId?: string | ObjectId): Promise<number> {
    try {
        const collection = getMediasCollection()
        let filter: Filter<BddbMedia> = {is_deleted: false}

        if (volumeId) {
            filter = {
                ...filter,
                volume_id: typeof volumeId === 'string' ? new ObjectId(volumeId) : volumeId,
            }
        }

        return await collection.countDocuments(filter)
    } catch (error) {
        console.error('[mongodb] getMediaCount error:', error)
        return 0
    }
}

// ─── 清理相关 ─────────────────────────────────────────────────────────────────

/**
 * 清空所有数据
 */
export async function clearAllData(): Promise<void> {
    try {
        const torrentsCollection = getTorrentsCollection()
        const volumesCollection = getVolumesCollection()
        const mediasCollection = getMediasCollection()

        await torrentsCollection.deleteMany({})
        await volumesCollection.deleteMany({})
        await mediasCollection.deleteMany({})
    } catch (error) {
        console.error('[mongodb] clearAllData error:', error)
        throw error
    }
}

/**
 * 初始化索引
 */
export async function initIndexes(): Promise<void> {
    try {
        const torrentsCollection = getTorrentsCollection()
        const volumesCollection = getVolumesCollection()
        const mediasCollection = getMediasCollection()

        // torrents 索引
        await torrentsCollection.createIndex({hash: 1}, {unique: true})
        await torrentsCollection.createIndex({is_deleted: 1, added_on: -1})
        await torrentsCollection.createIndex({state: 1})
        await torrentsCollection.createIndex({category: 1})

        // volumes 索引
        await volumesCollection.createIndex({torrent_id: 1, is_deleted: 1})
        await volumesCollection.createIndex({volume_no: 1})
        await volumesCollection.createIndex({catalog_no: 1})

        // medias 索引
        await mediasCollection.createIndex({volume_id: 1, is_deleted: 1})
        await mediasCollection.createIndex({media_no: 1, media_type: 1})
    } catch (error) {
        console.error('[mongodb] initIndexes error:', error)
        throw error
    }
}

// ─── 扩展功能 ─────────────────────────────────────────────────────────────────

/**
 * 根据 hash 获取未删除的种子 (兼容旧 getTorrent)
 */
export async function getTorrent(hash: string): Promise<BddbTorrent | null> {
    return getTorrentByHash(hash)
}

/**
 * 获取种子文件列表转换为 FileItem 格式
 */
export async function getTorrentFilesAsFileItems(torrentId: string | ObjectId): Promise<{id: string; name: string; size: number; progress: number}[]> {
    try {
        const torrent = await getTorrentById(torrentId)
        if (!torrent) return []
        return torrent.files.map(f => ({
            id: f._id.toString(),
            name: f.name,
            size: f.size ?? 0,
            progress: f.progress ?? 0,
        }))
    } catch (error) {
        console.error('[mongodb] getTorrentFilesAsFileItems error:', error)
        return []
    }
}

/**
 * 保存种子文件 (更新嵌入在种子中的文件列表)
 * 按 name 匹配已有文件以保留 _id
 */
export async function saveTorrentFiles(torrentId: string | ObjectId, files: Array<{
    name: string; size?: number; progress?: number; priority?: number;
    is_seed?: boolean; piece_range?: [number, number]; availability?: number;
}>): Promise<void> {
    try {
        const collection = getTorrentsCollection()
        const _id = typeof torrentId === 'string' ? new ObjectId(torrentId) : torrentId
        const torrent = await collection.findOne({_id})
        if (!torrent) return

        const now = Math.floor(Date.now() / 1000)
        const existingFileMap = new Map(torrent.files.map(f => [f.name, f]))

        const newFiles: BddbTorrentFile[] = files.map(f => {
            const existing = existingFileMap.get(f.name)
            return {
                ...(existing || {}),
                _id: existing?._id ?? new ObjectId(),
                name: f.name,
                size: f.size ?? 0,
                progress: f.progress ?? 0,
                priority: f.priority ?? 0,
                is_seed: f.is_seed ?? false,
                piece_range: f.piece_range ?? [0, 0],
                availability: f.availability ?? 0,
                created_at: existing?.created_at ?? now,
                updated_at: now,
            } as BddbTorrentFile
        })

        await collection.updateOne(
            {_id},
            {$set: {files: newFiles, updated_at: now}}
        )
    } catch (error) {
        console.error('[mongodb] saveTorrentFiles error:', error)
        throw error
    }
}

/**
 * 软删除种子文件 (清空文件列表)
 */
export async function softDeleteTorrentFiles(torrentId: string | ObjectId): Promise<void> {
    try {
        const collection = getTorrentsCollection()
        const _id = typeof torrentId === 'string' ? new ObjectId(torrentId) : torrentId
        const now = Math.floor(Date.now() / 1000)
        await collection.updateOne({_id}, {$set: {files: [], updated_at: now}})
    } catch (error) {
        console.error('[mongodb] softDeleteTorrentFiles error:', error)
        throw error
    }
}

/**
 * 删除过期卷 (保留指定 volume_no 的卷，其余软删除)
 */
export async function deleteStaleVolumes(torrentId: string | ObjectId, keepVolumeNos: number[]): Promise<void> {
    try {
        const collection = getVolumesCollection()
        const tid = typeof torrentId === 'string' ? new ObjectId(torrentId) : torrentId
        const now = Math.floor(Date.now() / 1000)

        const filter: Filter<BddbVolume> = {
            torrent_id: tid,
            is_deleted: false,
            ...(keepVolumeNos.length > 0 ? {volume_no: {$nin: keepVolumeNos}} : {}),
        }

        await collection.updateMany(filter, {$set: {is_deleted: true, updated_at: now}})
    } catch (error) {
        console.error('[mongodb] deleteStaleVolumes error:', error)
        throw error
    }
}

/**
 * 删除过期媒体 (保留指定 media_no + media_type 的媒体，其余软删除)
 */
export async function deleteStaleMedias(volumeId: string | ObjectId, keepMedias: {media_no: number; media_type: MediaType}[]): Promise<void> {
    try {
        const collection = getMediasCollection()
        const vid = typeof volumeId === 'string' ? new ObjectId(volumeId) : volumeId
        const now = Math.floor(Date.now() / 1000)

        if (keepMedias.length === 0) {
            await collection.updateMany(
                {volume_id: vid, is_deleted: false},
                {$set: {is_deleted: true, updated_at: now}}
            )
            return
        }

        // 构建排除条件
        const keepConditions = keepMedias.map(m => ({media_no: m.media_no, media_type: m.media_type}))
        await collection.updateMany(
            {
                volume_id: vid,
                is_deleted: false,
                $nor: keepConditions,
            },
            {$set: {is_deleted: true, updated_at: now}}
        )
    } catch (error) {
        console.error('[mongodb] deleteStaleMedias error:', error)
        throw error
    }
}

/**
 * 根据 ID 获取卷
 */
export async function getVolumeById(volumeId: string | ObjectId): Promise<BddbVolume | null> {
    try {
        const collection = getVolumesCollection()
        const _id = typeof volumeId === 'string' ? new ObjectId(volumeId) : volumeId
        return await collection.findOne({_id, is_deleted: false})
    } catch (error) {
        console.error('[mongodb] getVolumeById error:', error)
        return null
    }
}

/**
 * 获取卷的文件列表 (从关联的种子中解析)
 */
export async function getVolumeFilesAsFileItems(volumeId: string | ObjectId): Promise<{id: string; name: string; size: number; progress: number}[]> {
    try {
        const volume = await getVolumeById(volumeId)
        if (!volume) return []

        const torrent = await getTorrentById(volume.torrent_id)
        if (!torrent) return []

        const fileIdSet = new Set(volume.file_ids.map(id => id.toString()))
        return torrent.files
            .filter(f => fileIdSet.has(f._id.toString()))
            .map(f => ({
                id: f._id.toString(),
                name: f.name,
                size: f.size ?? 0,
                progress: f.progress ?? 0,
            }))
    } catch (error) {
        console.error('[mongodb] getVolumeFilesAsFileItems error:', error)
        return []
    }
}

/**
 * 保存卷 (适配旧接口: torrentId + fileIds + data)
 */
export async function saveVolumeCompat(
    torrentId: string | ObjectId,
    fileIds: string[],
    data: {volume_no?: number; catalog_no?: string; volume_name?: string}
): Promise<void> {
    const tid = typeof torrentId === 'string' ? new ObjectId(torrentId) : torrentId
    const volume: BddbVolume = {
        _id: new ObjectId(),
        torrent_id: tid,
        volume_no: data.volume_no ?? 0,
        catalog_no: data.catalog_no ?? '',
        volume_name: data.volume_name,
        is_deleted: false,
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000),
        file_ids: fileIds.map(id => new ObjectId(id)),
    }
    await saveVolume(volume)
}

/**
 * 保存媒体 (适配旧接口: volumeId + fileIds + data)
 */
export async function saveMediaCompat(
    volumeId: string | ObjectId,
    fileIds: string[],
    data: {media_no?: number; media_type?: MediaType; content_title?: string; description?: string}
): Promise<void> {
    const vid = typeof volumeId === 'string' ? new ObjectId(volumeId) : volumeId
    const media: BddbMedia = {
        _id: new ObjectId(),
        volume_id: vid,
        media_no: data.media_no ?? 0,
        media_type: data.media_type ?? 'bd',
        content_title: data.content_title,
        description: data.description,
        is_deleted: false,
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000),
        file_ids: fileIds.map(id => new ObjectId(id)),
    }
    await saveMedia(media)
}

/**
 * 获取所有种子文件名 (用于计算路径前缀)
 */
export async function getAllTorrentFileNames(torrentId: string | ObjectId): Promise<string[]> {
    try {
        const torrent = await getTorrentById(torrentId)
        if (!torrent) return []
        return torrent.files.map(f => f.name)
    } catch (error) {
        console.error('[mongodb] getAllTorrentFileNames error:', error)
        return []
    }
}

// ─── 兼容旧命名导出（删除 lib/db 后直接使用）────────────────────────────────

export const getVolumesByTorrent = getVolumesByTorrentId
export const getVolumesByFile = getVolumesByFileId
export const getMediasByVolume = getMediasByVolumeId
export const saveVolumeLegacy = saveVolumeCompat
export const saveMediaLegacy = saveMediaCompat
