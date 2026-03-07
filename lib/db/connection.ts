import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DATA_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'bddb.sqlite')

const g = global as typeof globalThis & { _sqliteDb?: Database.Database }

export function getDb(): Database.Database {
    if (!g._sqliteDb) {
        fs.mkdirSync(DATA_DIR, {recursive: true})
        const db = new Database(DB_PATH)
        db.pragma('journal_mode = WAL')
        db.pragma('foreign_keys = ON')
        initSchema(db)
        g._sqliteDb = db
        console.log(`[db] SQLite ready: ${DB_PATH}`)
    }
    return g._sqliteDb
}

function initSchema(db: Database.Database): void {
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
        CREATE INDEX IF NOT EXISTS idx_torrents_state   ON torrents(state);
        CREATE INDEX IF NOT EXISTS idx_torrents_cat     ON torrents(category);

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
}
