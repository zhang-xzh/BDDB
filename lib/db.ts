// ─── 数据层：类型 + 内存存储 + CRUD ──────────────────────────────────────────
import fs from 'fs/promises'
import path from 'path'
import {customAlphabet} from 'nanoid'
import type {Torrent as QbTorrent, TorrentFile as QbTorrentFile} from '@ctrl/qbittorrent'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Torrent {
    id?: string
    qb_torrent: QbTorrent
    is_deleted: boolean
    synced_at: number
}

export interface TorrentWithVolume extends Torrent {
    hasVolumes?: boolean
    volumeCount?: number
}

export interface StoredFile {
    id: string
    qb_torrent_file: QbTorrentFile
    is_deleted: boolean
    synced_at: number
}

export interface TorrentRecord {
    id: string
    hash: string
    added_on: number
    qb_torrent: QbTorrent
    is_deleted: boolean
    synced_at: number
    files: StoredFile[]
}

export interface Volume {
    id: string
    torrent_id: string
    torrent_file_ids: string[]
    type?: 'volume' | 'box'
    volume_no: number
    catalog_no: string
    volume_name?: string
    is_deleted: boolean
    updated_at: number
}

export interface VolumeForm {
    catalog_no: string
    volume_name: string
    type?: 'volume' | 'box'
}

export interface NodeData {
    volume_no?: number
    shared_volume_nos?: number[]
    files?: string[]
}

export interface FileItem {
    id?: string
    name: string
    size: number
    progress: number
}

// ─── Store (内存 Map + 文件 I/O) ──────────────────────────────────────────────

const DATA_DIR = path.join(process.cwd(), 'data')
export const TORRENTS_DIR = path.join(DATA_DIR, 'torrents')
export const VOLUMES_FILE = path.join(DATA_DIR, 'volumes.json')

export const byHash = new Map<string, TorrentRecord>()   // hash → record
export const byId = new Map<string, TorrentRecord>()   // id   → record
export const fileIndex = new Map<string, string>()      // fileId → torrentHash
export const volumesMap = new Map<string, Volume>()      // id → volume

let initPromise: Promise<void> | null = null

export function ensureInit(): Promise<void> {
    if (!initPromise) initPromise = _init()
    return initPromise
}

async function _init(): Promise<void> {
    await fs.mkdir(TORRENTS_DIR, {recursive: true})

    const files = await fs.readdir(TORRENTS_DIR).catch(() => [] as string[])
    await Promise.all(
        files.filter(f => f.endsWith('.json')).map(async f => {
            try {
                const content = await fs.readFile(path.join(TORRENTS_DIR, f), 'utf-8')
                const record: TorrentRecord = JSON.parse(content)
                byHash.set(record.hash, record)
                byId.set(record.id, record)
                for (const file of record.files ?? []) fileIndex.set(file.id, record.hash)
            } catch { /* 跳过损坏文件 */
            }
        })
    )

    try {
        const content = await fs.readFile(VOLUMES_FILE, 'utf-8')
        const volumes: Volume[] = JSON.parse(content)
        for (const v of volumes) volumesMap.set(v.id, v)
    } catch { /* 文件不存在时忽略 */
    }

    console.log(`Store loaded: ${byHash.size} torrents, ${volumesMap.size} volumes`)
}

export async function writeTorrent(record: TorrentRecord): Promise<void> {
    const filePath = path.join(TORRENTS_DIR, `${record.hash}.json`)
    const tmpPath = `${filePath}.tmp`
    await fs.writeFile(tmpPath, JSON.stringify(record))
    await fs.rename(tmpPath, filePath)
}

export async function writeVolumes(): Promise<void> {
    await fs.mkdir(DATA_DIR, {recursive: true})
    const tmpPath = `${VOLUMES_FILE}.${Date.now()}.tmp`
    await fs.writeFile(tmpPath, JSON.stringify(Array.from(volumesMap.values())))
    await fs.rename(tmpPath, VOLUMES_FILE)
}

export async function removeTorrentFile(hash: string): Promise<void> {
    await fs.unlink(path.join(TORRENTS_DIR, `${hash}.json`)).catch(() => {
    })
}

// ─── Repository (CRUD) ────────────────────────────────────────────────────────

const generateId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 16)
const now = () => Math.floor(Date.now() / 1000)

function recordToTorrent(r: TorrentRecord): Torrent {
    return {id: r.id, qb_torrent: r.qb_torrent, is_deleted: r.is_deleted, synced_at: r.synced_at}
}

// Torrents

export async function getTorrent(hash: string): Promise<Torrent | null> {
    await ensureInit()
    const r = byHash.get(hash)
    return r ? recordToTorrent(r) : null
}

export async function getAllTorrents(includeDeleted = false): Promise<Torrent[]> {
    await ensureInit()
    const records = Array.from(byHash.values())
    const filtered = includeDeleted ? records : records.filter(r => !r.is_deleted)
    filtered.sort((a, b) => b.added_on - a.added_on)
    return filtered.map(recordToTorrent)
}

export async function getAllTorrentsWithFiles(includeDeleted = false): Promise<(Torrent & {files: StoredFile[]})[]> {
    await ensureInit()
    const records = Array.from(byHash.values())
    const filtered = includeDeleted ? records : records.filter(r => !r.is_deleted)
    filtered.sort((a, b) => b.added_on - a.added_on)
    return filtered.map(r => ({
        ...recordToTorrent(r),
        files: r.files
    }))
}

export async function softDeleteTorrent(hash: string): Promise<void> {
    await ensureInit()
    const r = byHash.get(hash)
    if (!r) return
    r.is_deleted = true
    r.synced_at = now()
    await writeTorrent(r)
}

// Files

export async function saveTorrentFiles(torrentId: string, files: any[]): Promise<void> {
    await ensureInit()
    const r = byId.get(torrentId)
    if (!r) return
    for (const f of r.files) fileIndex.delete(f.id)
    const ts = now()
    r.files = files.map(f => {
        const id = generateId()
        const stored: StoredFile = {id, qb_torrent_file: f.qb_torrent_file ?? f, is_deleted: false, synced_at: ts}
        fileIndex.set(id, r.hash)
        return stored
    })
    await writeTorrent(r)
}

export async function getTorrentFilesAsFileItems(torrentId: string): Promise<FileItem[]> {
    await ensureInit()
    const r = byId.get(torrentId)
    if (!r) return []
    return r.files
        .filter(f => !f.is_deleted)
        .map(f => ({
            id: f.id,
            name: f.qb_torrent_file.name,
            size: f.qb_torrent_file.size,
            progress: (f.qb_torrent_file as any).progress || 0,
        }))
}

export async function softDeleteTorrentFiles(torrentId: string): Promise<void> {
    await ensureInit()
    const r = byId.get(torrentId)
    if (!r) return
    const ts = now()
    r.files = r.files.map(f => ({...f, is_deleted: true, synced_at: ts}))
    await writeTorrent(r)
}

// Volumes

export async function getVolumesByTorrent(torrentId: string): Promise<Volume[]> {
    await ensureInit()
    return Array.from(volumesMap.values())
        .filter(v => v.torrent_id === torrentId && !v.is_deleted)
        .sort((a, b) => a.volume_no - b.volume_no)
}

export async function getVolumesByFile(fileId: string): Promise<Volume[]> {
    await ensureInit()
    return Array.from(volumesMap.values())
        .filter(v => !v.is_deleted && v.torrent_file_ids.includes(fileId))
        .sort((a, b) => a.volume_no - b.volume_no)
}

export async function getAllVolumes(): Promise<Volume[]> {
    await ensureInit()
    return Array.from(volumesMap.values()).filter(v => !v.is_deleted)
}

export function getVolumeCounts(): Map<string, number> {
    const counts = new Map<string, number>()
    for (const v of volumesMap.values()) {
        if (!v.is_deleted) counts.set(v.torrent_id, (counts.get(v.torrent_id) ?? 0) + 1)
    }
    return counts
}

export async function saveVolume(torrentId: string, files: string[], data: Partial<Volume>): Promise<void> {
    await ensureInit()
    const existing = Array.from(volumesMap.values()).find(
        v => v.torrent_id === torrentId && v.volume_no === data.volume_no && !v.is_deleted
    )
    if (existing) {
        existing.torrent_file_ids = files
        existing.type = data.type
        existing.catalog_no = data.catalog_no ?? ''
        existing.volume_name = data.volume_name
        existing.is_deleted = false
        existing.updated_at = now()
    } else {
        const v: Volume = {
            id: generateId(),
            torrent_id: torrentId,
            torrent_file_ids: files,
            type: data.type,
            volume_no: data.volume_no ?? 0,
            catalog_no: data.catalog_no ?? '',
            volume_name: data.volume_name,
            is_deleted: false,
            updated_at: now(),
        }
        volumesMap.set(v.id, v)
    }
    await writeVolumes()
}

export function deleteStaleVolumes(torrentId: string, keepVolumeNos: number[]): void {
    const ts = now()
    for (const v of volumesMap.values()) {
        if (v.torrent_id === torrentId && !v.is_deleted && !keepVolumeNos.includes(v.volume_no)) {
            v.is_deleted = true
            v.updated_at = ts
        }
    }
    writeVolumes() // fire-and-forget
}

export async function clearAllData(): Promise<void> {
    await ensureInit()
    for (const hash of byHash.keys()) await removeTorrentFile(hash)
    byHash.clear();
    byId.clear();
    fileIndex.clear();
    volumesMap.clear()
    await writeVolumes()
}
