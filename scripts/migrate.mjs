/**
 * One-time migration: data/torrents/{hash}.json + data/volumes.json -> SQLite (flat columns)
 *
 * Usage:
 *   node scripts/migrate.mjs                        # use default ./data directory
 *   node scripts/migrate.mjs --data /path/to/data   # specify data directory
 *   node scripts/migrate.mjs --force                # wipe DB and re-import
 */

import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import {fileURLToPath} from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const args = process.argv.slice(2)
const force = args.includes('--force')
const dataArgIdx = args.indexOf('--data')
const DATA_DIR = dataArgIdx !== -1 && args[dataArgIdx + 1]
    ? path.resolve(args[dataArgIdx + 1])
    : path.join(ROOT, 'data')

const TORRENTS_DIR = path.join(DATA_DIR, 'torrents')
const VOLUMES_FILE = path.join(DATA_DIR, 'volumes.json')
const DB_PATH = path.join(DATA_DIR, 'bddb.sqlite')

console.log(`[migrate] Data directory: ${DATA_DIR}`)
// ─── Open / init DB ──────────────────────────────────────────────────────────

fs.mkdirSync(DATA_DIR, {recursive: true})
const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
    CREATE TABLE IF NOT EXISTS torrents (
        id                 TEXT PRIMARY KEY,
        hash               TEXT UNIQUE NOT NULL,
        added_on           INTEGER NOT NULL,
        is_deleted         INTEGER NOT NULL DEFAULT 0,
        synced_at          INTEGER NOT NULL,
        name               TEXT,
        magnet_uri         TEXT,
        size               INTEGER,
        progress           REAL,
        dlspeed            INTEGER,
        upspeed            INTEGER,
        priority           INTEGER,
        num_seeds          INTEGER,
        num_complete       INTEGER,
        num_leechs         INTEGER,
        num_incomplete     INTEGER,
        ratio              REAL,
        eta                INTEGER,
        state              TEXT,
        seq_dl             INTEGER,
        f_l_piece_prio     INTEGER,
        completion_on      INTEGER,
        tracker            TEXT,
        trackers_count     INTEGER,
        dl_limit           INTEGER,
        up_limit           INTEGER,
        downloaded         INTEGER,
        uploaded           INTEGER,
        downloaded_session INTEGER,
        uploaded_session   INTEGER,
        amount_left        INTEGER,
        save_path          TEXT,
        completed          INTEGER,
        max_ratio          REAL,
        max_seeding_time   INTEGER,
        ratio_limit        REAL,
        seeding_time_limit INTEGER,
        super_seeding      INTEGER,
        seen_complete      INTEGER,
        last_activity      INTEGER,
        total_size         INTEGER,
        time_active        INTEGER,
        category           TEXT,
        tags               TEXT,
        content_path       TEXT,
        auto_tmm           INTEGER,
        availability       REAL,
        force_start        INTEGER,
        is_private         INTEGER,
        reannounce         INTEGER,
        seeding_time       INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_torrents_deleted ON torrents(is_deleted, added_on DESC);

    CREATE TABLE IF NOT EXISTS torrent_files (
        id                TEXT PRIMARY KEY,
        torrent_id        TEXT NOT NULL REFERENCES torrents(id),
        is_deleted        INTEGER NOT NULL DEFAULT 0,
        synced_at         INTEGER NOT NULL,
        name              TEXT NOT NULL,
        size              INTEGER,
        progress          REAL,
        priority          INTEGER,
        is_seed           INTEGER,
        piece_range_start INTEGER,
        piece_range_end   INTEGER,
        availability      REAL,
        UNIQUE (torrent_id, name)
    );
    CREATE INDEX IF NOT EXISTS idx_tf_torrent_id ON torrent_files(torrent_id);

    CREATE TABLE IF NOT EXISTS volumes (
        id           TEXT PRIMARY KEY,
        torrent_id   TEXT NOT NULL REFERENCES torrents(id),
        volume_no    INTEGER NOT NULL,
        catalog_no   TEXT NOT NULL,
        volume_name  TEXT,
        is_deleted   INTEGER NOT NULL DEFAULT 0,
        updated_at   INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_volumes_torrent ON volumes(torrent_id, is_deleted);

    CREATE TABLE IF NOT EXISTS volume_files (
        volume_id TEXT NOT NULL REFERENCES volumes(id),
        file_id   TEXT NOT NULL REFERENCES torrent_files(id),
        PRIMARY KEY (volume_id, file_id)
    );
    CREATE INDEX IF NOT EXISTS idx_volume_files_file ON volume_files(file_id);

    CREATE TABLE IF NOT EXISTS medias (
        id              TEXT PRIMARY KEY,
        volume_id       TEXT NOT NULL REFERENCES volumes(id),
        media_no        INTEGER NOT NULL,
        media_type      TEXT NOT NULL,
        content_title   TEXT,
        description     TEXT,
        is_deleted      INTEGER NOT NULL DEFAULT 0,
        updated_at      INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_medias_volume ON medias(volume_id, is_deleted);

    CREATE TABLE IF NOT EXISTS media_files (
        media_id TEXT NOT NULL REFERENCES medias(id),
        file_id  TEXT NOT NULL REFERENCES torrent_files(id),
        PRIMARY KEY (media_id, file_id)
    );
    CREATE INDEX IF NOT EXISTS idx_media_files_file ON media_files(file_id);
`)

// ─── Guard: skip if data already exists ──────────────────────────────────────

const existing = db.prepare('SELECT COUNT(*) as cnt FROM torrents').get().cnt
if (existing > 0 && !force) {
    console.log(`[migrate] DB already has ${existing} torrents. Use --force to reimport.`)
    process.exit(0)
}

if (force && existing > 0) {
    console.log('[migrate] --force: wiping existing data...')
    db.transaction(() => {
        db.prepare('DELETE FROM media_files').run()
        db.prepare('DELETE FROM medias').run()
        db.prepare('DELETE FROM volume_files').run()
        db.prepare('DELETE FROM volumes').run()
        db.prepare('DELETE FROM torrent_files').run()
        db.prepare('DELETE FROM torrents').run()
    })()
}

// ─── Load JSON source files ───────────────────────────────────────────────────

const torrentFiles = fs.existsSync(TORRENTS_DIR)
    ? fs.readdirSync(TORRENTS_DIR).filter(f => f.endsWith('.json') && !f.endsWith('.tmp'))
    : []

const records = []
for (const fname of torrentFiles) {
    try {
        records.push(JSON.parse(fs.readFileSync(path.join(TORRENTS_DIR, fname), 'utf-8')))
    } catch (e) {
        console.warn(`[migrate] Skipping corrupted file: ${fname}`)
    }
}

let volumes = []
if (fs.existsSync(VOLUMES_FILE)) {
    try {
        volumes = JSON.parse(fs.readFileSync(VOLUMES_FILE, 'utf-8'))
    } catch {
        console.warn('[migrate] Could not parse volumes.json')
    }
}

console.log(`[migrate] Found ${records.length} torrent JSON files, ${volumes.length} volumes`)

// ─── Build lookup sets for FK validation ─────────────────────────────────────

const validTorrentIds = new Set(records.map(r => r.id))
const validFileIds = new Set()
for (const r of records) for (const f of r.files ?? []) validFileIds.add(f.id)

// ─── Prepared statements ──────────────────────────────────────────────────────

const insTorrent = db.prepare(`
    INSERT OR IGNORE INTO torrents (
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
        ?,?,?,?,
        ?,?,?,?,?,
        ?,?,?,?,
        ?,?,?
    )
`)

const insTorrentFile = db.prepare(`
    INSERT OR IGNORE INTO torrent_files
        (id, torrent_id, is_deleted, synced_at, name, size, progress, priority, is_seed, piece_range_start, piece_range_end, availability)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

const insVolume = db.prepare(`
    INSERT OR IGNORE INTO volumes (id, torrent_id, volume_no, catalog_no, volume_name, is_deleted, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
`)

const insVolumeFile = db.prepare(
    'INSERT OR IGNORE INTO volume_files (volume_id, file_id) VALUES (?, ?)'
)

// medias 表无旧数据，无需迁移

// ─── Helper ───────────────────────────────────────────────────────────────────

const b = v => v == null ? null : (v ? 1 : 0)

// ─── Migrate ──────────────────────────────────────────────────────────────────

let torrentCount = 0
let fileCount = 0
let volumeCount = 0
let volumeFileCount = 0
let skippedFiles = 0

db.transaction(() => {
    for (const r of records) {
        const t = r.qb_torrent ?? {}

        insTorrent.run(
            r.id, r.hash, r.added_on, r.is_deleted ? 1 : 0, r.synced_at,
            t.name ?? null, t.magnet_uri ?? null, t.size ?? null, t.progress ?? null,
            t.dlspeed ?? null, t.upspeed ?? null, t.priority ?? null,
            t.num_seeds ?? null, t.num_complete ?? null, t.num_leechs ?? null,
            t.num_incomplete ?? null, t.ratio ?? null, t.eta ?? null, t.state ?? null,
            b(t.seq_dl), b(t.f_l_piece_prio), t.completion_on ?? null,
            t.tracker ?? null, t.trackers_count ?? null,
            t.dl_limit ?? null, t.up_limit ?? null, t.downloaded ?? null,
            t.uploaded ?? null, t.downloaded_session ?? null, t.uploaded_session ?? null,
            t.amount_left ?? null, t.save_path ?? null, t.completed ?? null,
            t.max_ratio ?? null, t.max_seeding_time ?? null,
            t.ratio_limit ?? null, t.seeding_time_limit ?? null,
            b(t.super_seeding), t.seen_complete ?? null, t.last_activity ?? null,
            t.total_size ?? null, t.time_active ?? null, t.category ?? null,
            t.tags ?? null, t.content_path ?? null, b(t.auto_tmm),
            t.availability ?? null, b(t.force_start),
            t.isPrivate != null ? b(t.isPrivate) : null,
            t.reannounce ?? null, t.seeding_time ?? null,
        )
        torrentCount++

        for (const f of r.files ?? []) {
            const qbf = f.qb_torrent_file ?? {}
            if (!qbf.name) { skippedFiles++; continue }
            insTorrentFile.run(
                f.id, r.id, f.is_deleted ? 1 : 0, f.synced_at,
                qbf.name, qbf.size ?? null, qbf.progress ?? null, qbf.priority ?? null,
                qbf.is_seed != null ? b(qbf.is_seed) : null,
                qbf.piece_range?.[0] ?? null, qbf.piece_range?.[1] ?? null,
                qbf.availability ?? null,
            )
            fileCount++
        }
    }

    for (const v of volumes) {
        if (!validTorrentIds.has(v.torrent_id)) continue
        insVolume.run(
            v.id, v.torrent_id, v.volume_no,
            v.catalog_no, v.volume_name ?? null,
            v.is_deleted ? 1 : 0, v.updated_at,
        )
        volumeCount++

        for (const fileId of v.torrent_file_ids ?? []) {
            if (!validFileIds.has(fileId)) continue
            insVolumeFile.run(v.id, fileId)
            volumeFileCount++
        }
    }
})()

console.log(`[migrate] Done:`)
console.log(`  torrents:     ${torrentCount}`)
console.log(`  files:        ${fileCount}${skippedFiles ? ` (${skippedFiles} skipped, no name)` : ''}`)
console.log(`  volumes:      ${volumeCount}`)
console.log(`  volume_files: ${volumeFileCount}`)
console.log(`  medias:       0 (新表，无旧数据)`)
console.log(`  media_files:  0 (新表，无旧数据)`)

db.close()
