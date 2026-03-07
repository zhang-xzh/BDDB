import {customAlphabet} from 'nanoid'
import {getDb} from './connection'
import type {FileItem, StoredFile, Torrent, TorrentRecord, Volume} from './schema'

const generateId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 16)
const now = () => Math.floor(Date.now() / 1000)

// ─── Internal row types ───────────────────────────────────────────────────────

interface TorrentRow {
    id: string; hash: string; added_on: number; is_deleted: number; synced_at: number;
    name: string | null; magnet_uri: string | null; size: number | null; progress: number | null;
    dlspeed: number | null; upspeed: number | null; priority: number | null;
    num_seeds: number | null; num_complete: number | null; num_leechs: number | null;
    num_incomplete: number | null; ratio: number | null; eta: number | null; state: string | null;
    seq_dl: number | null; f_l_piece_prio: number | null; completion_on: number | null;
    tracker: string | null; trackers_count: number | null;
    dl_limit: number | null; up_limit: number | null; downloaded: number | null; uploaded: number | null;
    downloaded_session: number | null; uploaded_session: number | null;
    amount_left: number | null; save_path: string | null; completed: number | null;
    max_ratio: number | null; max_seeding_time: number | null;
    ratio_limit: number | null; seeding_time_limit: number | null;
    super_seeding: number | null; seen_complete: number | null; last_activity: number | null;
    total_size: number | null; time_active: number | null; category: string | null;
    tags: string | null; content_path: string | null; auto_tmm: number | null;
    availability: number | null; force_start: number | null; is_private: number | null;
    reannounce: number | null; seeding_time: number | null;
}

interface FileRow {
    id: string; torrent_id: string; is_deleted: number; synced_at: number;
    name: string; size: number | null; progress: number | null; priority: number | null;
    is_seed: number | null; piece_range_start: number | null; piece_range_end: number | null;
    availability: number | null;
}

interface VolumeRow {
    id: string; torrent_id: string; type: string | null; volume_no: number; catalog_no: string
    volume_name: string | null; media_type: string | null; is_deleted: number; updated_at: number
}

// ─── Row converters ───────────────────────────────────────────────────────────

function rowToTorrent(row: TorrentRow): Torrent {
    return {
        id: row.id, hash: row.hash, added_on: row.added_on,
        is_deleted: Boolean(row.is_deleted), synced_at: row.synced_at,
        name: row.name ?? undefined,
        magnet_uri: row.magnet_uri ?? undefined,
        size: row.size ?? undefined,
        progress: row.progress ?? undefined,
        dlspeed: row.dlspeed ?? undefined,
        upspeed: row.upspeed ?? undefined,
        priority: row.priority ?? undefined,
        num_seeds: row.num_seeds ?? undefined,
        num_complete: row.num_complete ?? undefined,
        num_leechs: row.num_leechs ?? undefined,
        num_incomplete: row.num_incomplete ?? undefined,
        ratio: row.ratio ?? undefined,
        eta: row.eta ?? undefined,
        state: row.state ?? undefined,
        seq_dl: row.seq_dl != null ? Boolean(row.seq_dl) : undefined,
        f_l_piece_prio: row.f_l_piece_prio != null ? Boolean(row.f_l_piece_prio) : undefined,
        completion_on: row.completion_on ?? undefined,
        tracker: row.tracker ?? undefined,
        trackers_count: row.trackers_count ?? undefined,
        dl_limit: row.dl_limit ?? undefined,
        up_limit: row.up_limit ?? undefined,
        downloaded: row.downloaded ?? undefined,
        uploaded: row.uploaded ?? undefined,
        downloaded_session: row.downloaded_session ?? undefined,
        uploaded_session: row.uploaded_session ?? undefined,
        amount_left: row.amount_left ?? undefined,
        save_path: row.save_path ?? undefined,
        completed: row.completed ?? undefined,
        max_ratio: row.max_ratio ?? undefined,
        max_seeding_time: row.max_seeding_time ?? undefined,
        ratio_limit: row.ratio_limit ?? undefined,
        seeding_time_limit: row.seeding_time_limit ?? undefined,
        super_seeding: row.super_seeding != null ? Boolean(row.super_seeding) : undefined,
        seen_complete: row.seen_complete ?? undefined,
        last_activity: row.last_activity ?? undefined,
        total_size: row.total_size ?? undefined,
        time_active: row.time_active ?? undefined,
        category: row.category ?? undefined,
        tags: row.tags ?? undefined,
        content_path: row.content_path ?? undefined,
        auto_tmm: row.auto_tmm != null ? Boolean(row.auto_tmm) : undefined,
        availability: row.availability ?? undefined,
        force_start: row.force_start != null ? Boolean(row.force_start) : undefined,
        is_private: row.is_private != null ? Boolean(row.is_private) : undefined,
        reannounce: row.reannounce ?? undefined,
        seeding_time: row.seeding_time ?? undefined,
    }
}

function rowToStoredFile(row: FileRow): StoredFile {
    return {
        id: row.id,
        torrent_id: row.torrent_id,
        is_deleted: Boolean(row.is_deleted),
        synced_at: row.synced_at,
        name: row.name,
        size: row.size ?? undefined,
        progress: row.progress ?? undefined,
        priority: row.priority ?? undefined,
        is_seed: row.is_seed != null ? Boolean(row.is_seed) : undefined,
        piece_range: row.piece_range_start != null && row.piece_range_end != null
            ? [row.piece_range_start, row.piece_range_end]
            : null,
        availability: row.availability ?? undefined,
    }
}

function rowToVolume(row: VolumeRow, fileIds: string[]): Volume {
    return {
        id: row.id,
        torrent_id: row.torrent_id,
        type: row.type as Volume['type'],
        volume_no: row.volume_no,
        catalog_no: row.catalog_no,
        volume_name: row.volume_name ?? undefined,
        media_type: row.media_type as Volume['media_type'],
        is_deleted: Boolean(row.is_deleted),
        updated_at: row.updated_at,
        torrent_file_ids: fileIds,
    }
}

function getVolumeFileIds(volumeId: string): string[] {
    const rows = getDb().prepare('SELECT file_id FROM volume_files WHERE volume_id = ?').all(volumeId) as {file_id: string}[]
    return rows.map(r => r.file_id)
}

// ─── Torrent upsert helpers ───────────────────────────────────────────────────

function torrentToParams(record: TorrentRecord): unknown[] {
    const b = (v: boolean | undefined) => v == null ? null : (v ? 1 : 0)
    return [
        record.id, record.hash, record.added_on, record.is_deleted ? 1 : 0, record.synced_at,
        record.name ?? null, record.magnet_uri ?? null, record.size ?? null, record.progress ?? null,
        record.dlspeed ?? null, record.upspeed ?? null, record.priority ?? null,
        record.num_seeds ?? null, record.num_complete ?? null, record.num_leechs ?? null,
        record.num_incomplete ?? null, record.ratio ?? null, record.eta ?? null, record.state ?? null,
        b(record.seq_dl), b(record.f_l_piece_prio), record.completion_on ?? null,
        record.tracker ?? null, record.trackers_count ?? null,
        record.dl_limit ?? null, record.up_limit ?? null, record.downloaded ?? null,
        record.uploaded ?? null, record.downloaded_session ?? null, record.uploaded_session ?? null,
        record.amount_left ?? null, record.save_path ?? null, record.completed ?? null,
        record.max_ratio ?? null, record.max_seeding_time ?? null,
        record.ratio_limit ?? null, record.seeding_time_limit ?? null,
        b(record.super_seeding), record.seen_complete ?? null, record.last_activity ?? null,
        record.total_size ?? null, record.time_active ?? null, record.category ?? null,
        record.tags ?? null, record.content_path ?? null, b(record.auto_tmm),
        record.availability ?? null, b(record.force_start), b(record.is_private),
        record.reannounce ?? null, record.seeding_time ?? null,
    ]
}

function fileToParams(f: StoredFile, torrentId: string): unknown[] {
    return [
        f.id, torrentId, f.is_deleted ? 1 : 0, f.synced_at,
        f.name, f.size ?? null, f.progress ?? null, f.priority ?? null,
        f.is_seed != null ? (f.is_seed ? 1 : 0) : null,
        f.piece_range?.[0] ?? null, f.piece_range?.[1] ?? null,
        f.availability ?? null,
    ]
}

// ─── Torrents ─────────────────────────────────────────────────────────────────

export async function getTorrent(hash: string): Promise<Torrent | null> {
    const row = getDb().prepare('SELECT * FROM torrents WHERE hash = ? AND is_deleted = 0').get(hash) as TorrentRow | undefined
    return row ? rowToTorrent(row) : null
}

export async function getTorrentByHash(hash: string): Promise<TorrentRecord | null> {
    const db = getDb()
    const row = db.prepare('SELECT * FROM torrents WHERE hash = ?').get(hash) as TorrentRow | undefined
    if (!row) return null
    const fileRows = db.prepare('SELECT * FROM torrent_files WHERE torrent_id = ?').all(row.id) as FileRow[]
    return {
        ...rowToTorrent(row),
        id: row.id,
        files: fileRows.map(rowToStoredFile),
    }
}

export async function getAllTorrents(includeDeleted = false): Promise<Torrent[]> {
    const sql = includeDeleted
        ? 'SELECT * FROM torrents ORDER BY added_on DESC'
        : 'SELECT * FROM torrents WHERE is_deleted = 0 ORDER BY added_on DESC'
    return (getDb().prepare(sql).all() as TorrentRow[]).map(rowToTorrent)
}

export async function getAllTorrentsWithFiles(includeDeleted = false): Promise<(Torrent & {files: StoredFile[]})[]> {
    const db = getDb()
    const sql = includeDeleted
        ? 'SELECT * FROM torrents ORDER BY added_on DESC'
        : 'SELECT * FROM torrents WHERE is_deleted = 0 ORDER BY added_on DESC'
    return (db.prepare(sql).all() as TorrentRow[]).map(row => {
        const fileRows = db.prepare('SELECT * FROM torrent_files WHERE torrent_id = ? AND is_deleted = 0').all(row.id) as FileRow[]
        return {...rowToTorrent(row), files: fileRows.map(rowToStoredFile)}
    })
}

export async function softDeleteTorrent(hash: string): Promise<void> {
    getDb().prepare('UPDATE torrents SET is_deleted = 1, synced_at = ? WHERE hash = ?').run(now(), hash)
}

export async function upsertTorrent(record: TorrentRecord): Promise<void> {
    const db = getDb()
    const run = db.transaction(() => {
        db.prepare(`
            INSERT INTO torrents (
                id, hash, added_on, is_deleted, synced_at,
                name, magnet_uri, size, progress, dlspeed, upspeed, priority,
                num_seeds, num_complete, num_leechs, num_incomplete, ratio, eta, state,
                seq_dl, f_l_piece_prio, completion_on, tracker, trackers_count,
                dl_limit, up_limit, downloaded, uploaded, downloaded_session, uploaded_session,
                amount_left, save_path, completed, max_ratio, max_seeding_time,
                ratio_limit, seeding_time_limit, super_seeding, seen_complete,
                last_activity, total_size, time_active, category, tags,
                content_path, auto_tmm, availability, force_start,
                is_private, reannounce, seeding_time
            ) VALUES (
                ?,?,?,?,?,
                ?,?,?,?,?,?,?,
                ?,?,?,?,?,?,?,
                ?,?,?,?,?,
                ?,?,?,?,?,?,
                ?,?,?,?,?,
                ?,?,?,?,?,
                ?,?,?,?,?,
                ?,?,?,?,
                ?,?,?
            )
            ON CONFLICT(hash) DO UPDATE SET
                synced_at = excluded.synced_at,
                is_deleted = excluded.is_deleted,
                name = excluded.name, magnet_uri = excluded.magnet_uri,
                size = excluded.size, progress = excluded.progress,
                dlspeed = excluded.dlspeed, upspeed = excluded.upspeed,
                priority = excluded.priority, num_seeds = excluded.num_seeds,
                num_complete = excluded.num_complete, num_leechs = excluded.num_leechs,
                num_incomplete = excluded.num_incomplete, ratio = excluded.ratio,
                eta = excluded.eta, state = excluded.state,
                seq_dl = excluded.seq_dl, f_l_piece_prio = excluded.f_l_piece_prio,
                completion_on = excluded.completion_on, tracker = excluded.tracker,
                trackers_count = excluded.trackers_count, dl_limit = excluded.dl_limit,
                up_limit = excluded.up_limit, downloaded = excluded.downloaded,
                uploaded = excluded.uploaded, downloaded_session = excluded.downloaded_session,
                uploaded_session = excluded.uploaded_session, amount_left = excluded.amount_left,
                save_path = excluded.save_path, completed = excluded.completed,
                max_ratio = excluded.max_ratio, max_seeding_time = excluded.max_seeding_time,
                ratio_limit = excluded.ratio_limit, seeding_time_limit = excluded.seeding_time_limit,
                super_seeding = excluded.super_seeding, seen_complete = excluded.seen_complete,
                last_activity = excluded.last_activity, total_size = excluded.total_size,
                time_active = excluded.time_active, category = excluded.category,
                tags = excluded.tags, content_path = excluded.content_path,
                auto_tmm = excluded.auto_tmm, availability = excluded.availability,
                force_start = excluded.force_start, is_private = excluded.is_private,
                reannounce = excluded.reannounce, seeding_time = excluded.seeding_time
        `).run(...torrentToParams(record))

        const ins = db.prepare(`
            INSERT OR IGNORE INTO torrent_files
                (id, torrent_id, is_deleted, synced_at, name, size, progress, priority, is_seed, piece_range_start, piece_range_end, availability)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        for (const f of record.files) ins.run(...fileToParams(f, record.id))
    })
    run()
}

// ─── Files ────────────────────────────────────────────────────────────────────

interface QbFileInput {
    name: string
    size?: number
    progress?: number
    priority?: number
    is_seed?: boolean
    piece_range?: [number, number]
    availability?: number
}

// Upsert files by (torrent_id, name) to preserve IDs — preventing volume_files reference breakage.
export async function saveTorrentFiles(torrentId: string, files: QbFileInput[]): Promise<void> {
    const db = getDb()
    const ts = now()
    const names = files.map(f => f.name)
    const run = db.transaction(() => {
        const upsert = db.prepare(`
            INSERT INTO torrent_files
                (id, torrent_id, is_deleted, synced_at, name, size, progress, priority, is_seed, piece_range_start, piece_range_end, availability)
            VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(torrent_id, name) DO UPDATE SET
                is_deleted        = 0,
                synced_at         = excluded.synced_at,
                size              = excluded.size,
                progress          = excluded.progress,
                priority          = excluded.priority,
                is_seed           = excluded.is_seed,
                piece_range_start = excluded.piece_range_start,
                piece_range_end   = excluded.piece_range_end,
                availability      = excluded.availability
        `)
        for (const f of files) {
            upsert.run(
                generateId(), torrentId, ts,
                f.name, f.size ?? null, f.progress ?? null, f.priority ?? null,
                f.is_seed != null ? (f.is_seed ? 1 : 0) : null,
                f.piece_range?.[0] ?? null, f.piece_range?.[1] ?? null,
                f.availability ?? null,
            )
        }
        // Soft-delete files that are no longer present in QB
        if (names.length > 0) {
            const ph = names.map(() => '?').join(',')
            db.prepare(`UPDATE torrent_files SET is_deleted = 1, synced_at = ? WHERE torrent_id = ? AND name NOT IN (${ph}) AND is_deleted = 0`)
                .run(ts, torrentId, ...names)
        } else {
            db.prepare('UPDATE torrent_files SET is_deleted = 1, synced_at = ? WHERE torrent_id = ? AND is_deleted = 0')
                .run(ts, torrentId)
        }
    })
    run()
}

export async function getTorrentFilesAsFileItems(torrentId: string): Promise<FileItem[]> {
    const rows = getDb()
        .prepare('SELECT * FROM torrent_files WHERE torrent_id = ? AND is_deleted = 0')
        .all(torrentId) as FileRow[]
    return rows.map(row => ({
        id: row.id,
        name: row.name,
        size: row.size ?? 0,
        progress: row.progress ?? 0,
    }))
}

export async function softDeleteTorrentFiles(torrentId: string): Promise<void> {
    getDb().prepare('UPDATE torrent_files SET is_deleted = 1, synced_at = ? WHERE torrent_id = ?').run(now(), torrentId)
}

// ─── Volumes ──────────────────────────────────────────────────────────────────

export async function getVolumesByTorrent(torrentId: string): Promise<Volume[]> {
    const rows = getDb()
        .prepare('SELECT * FROM volumes WHERE torrent_id = ? AND is_deleted = 0 ORDER BY volume_no ASC')
        .all(torrentId) as VolumeRow[]
    return rows.map(row => rowToVolume(row, getVolumeFileIds(row.id)))
}

export async function getVolumesByFile(fileId: string): Promise<Volume[]> {
    const rows = getDb().prepare(`
        SELECT v.* FROM volumes v
        INNER JOIN volume_files vf ON vf.volume_id = v.id
        WHERE vf.file_id = ? AND v.is_deleted = 0
        ORDER BY v.volume_no ASC
    `).all(fileId) as VolumeRow[]
    return rows.map(row => rowToVolume(row, getVolumeFileIds(row.id)))
}

export async function getAllVolumes(torrentId?: string): Promise<Volume[]> {
    const db = getDb()
    const rows = (torrentId
        ? db.prepare('SELECT * FROM volumes WHERE is_deleted = 0 AND torrent_id = ? ORDER BY volume_no ASC').all(torrentId)
        : db.prepare('SELECT * FROM volumes WHERE is_deleted = 0').all()
    ) as VolumeRow[]
    return rows.map(row => rowToVolume(row, getVolumeFileIds(row.id)))
}

export function getVolumeCounts(): Map<string, number> {
    const rows = getDb()
        .prepare('SELECT torrent_id, COUNT(*) as cnt FROM volumes WHERE is_deleted = 0 GROUP BY torrent_id')
        .all() as {torrent_id: string; cnt: number}[]
    const counts = new Map<string, number>()
    for (const r of rows) counts.set(r.torrent_id, r.cnt)
    return counts
}

export async function saveVolume(torrentId: string, files: string[], data: Partial<Volume>): Promise<void> {
    const db = getDb()
    const ts = now()
    const run = db.transaction(() => {
        const existing = db.prepare(
            'SELECT id FROM volumes WHERE torrent_id = ? AND volume_no = ? AND is_deleted = 0'
        ).get(torrentId, data.volume_no) as {id: string} | undefined

        const volumeId = existing?.id ?? generateId()

        if (existing) {
            db.prepare(`
                UPDATE volumes SET type = ?, catalog_no = ?, volume_name = ?, media_type = ?, updated_at = ?
                WHERE id = ?
            `).run(data.type ?? null, data.catalog_no ?? '', data.volume_name ?? null, data.media_type ?? null, ts, volumeId)
        } else {
            db.prepare(`
                INSERT INTO volumes (id, torrent_id, type, volume_no, catalog_no, volume_name, media_type, is_deleted, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
            `).run(volumeId, torrentId, data.type ?? null, data.volume_no ?? 0, data.catalog_no ?? '', data.volume_name ?? null, data.media_type ?? null, ts)
        }

        db.prepare('DELETE FROM volume_files WHERE volume_id = ?').run(volumeId)
        const insVF = db.prepare('INSERT OR IGNORE INTO volume_files (volume_id, file_id) VALUES (?, ?)')
        for (const fileId of files) insVF.run(volumeId, fileId)
    })
    run()
}

export function deleteStaleVolumes(torrentId: string, keepVolumeNos: number[]): void {
    const db = getDb()
    const ts = now()
    if (keepVolumeNos.length === 0) {
        db.prepare('UPDATE volumes SET is_deleted = 1, updated_at = ? WHERE torrent_id = ? AND is_deleted = 0').run(ts, torrentId)
        return
    }
    const placeholders = keepVolumeNos.map(() => '?').join(',')
    db.prepare(
        `UPDATE volumes SET is_deleted = 1, updated_at = ? WHERE torrent_id = ? AND is_deleted = 0 AND volume_no NOT IN (${placeholders})`
    ).run(ts, torrentId, ...keepVolumeNos)
}

export async function clearAllData(): Promise<void> {
    const db = getDb()
    db.transaction(() => {
        db.prepare('DELETE FROM volume_files').run()
        db.prepare('DELETE FROM volumes').run()
        db.prepare('DELETE FROM torrent_files').run()
        db.prepare('DELETE FROM torrents').run()
    })()
}
