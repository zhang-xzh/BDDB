-- ============================================================================
-- BDDB SQLite Schema
-- 三表结构 + JSON 存储
-- ============================================================================

-- ============================================================================
-- torrents 表
-- 存储种子元数据（qb_torrent 为 JSON，包含 QbTorrent 所有字段）
-- ============================================================================
CREATE TABLE IF NOT EXISTS torrents (
  id TEXT PRIMARY KEY,
  qb_torrent TEXT NOT NULL,
  is_deleted INTEGER DEFAULT 0,
  synced_at INTEGER
);

-- ============================================================================
-- torrent_files 表
-- 存储种子文件列表（qb_torrent_file 为 JSON，包含 QbTorrentFile 所有字段）
-- ============================================================================
CREATE TABLE IF NOT EXISTS torrent_files (
  id TEXT PRIMARY KEY,
  torrent_id TEXT NOT NULL,
  qb_torrent_file TEXT NOT NULL,
  is_deleted INTEGER DEFAULT 0,
  synced_at INTEGER
);

-- ============================================================================
-- volumes 表
-- 存储光盘/BOX 元数据（torrent_file_ids 为 JSON 数组）
-- ============================================================================
CREATE TABLE IF NOT EXISTS volumes (
  id TEXT PRIMARY KEY,
  torrent_id TEXT NOT NULL,
  torrent_file_ids TEXT NOT NULL,
  type TEXT,
  volume_no INTEGER,
  sort_order INTEGER,
  volume_name TEXT,
  catalog_no TEXT,
  suruga_id TEXT,
  note TEXT,
  title TEXT,
  release_date TEXT,
  maker TEXT,
  version_type TEXT,
  bonus_status TEXT,
  is_deleted INTEGER DEFAULT 0,
  created_at INTEGER,
  updated_at INTEGER
);

-- ============================================================================
-- 索引 - torrents
-- 使用表达式索引从 JSON 中提取字段
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_torrents_hash ON torrents((json_extract(qb_torrent, '$.hash')));
CREATE INDEX IF NOT EXISTS idx_torrents_name ON torrents((json_extract(qb_torrent, '$.name')));
CREATE INDEX IF NOT EXISTS idx_torrents_state ON torrents((json_extract(qb_torrent, '$.state')));
CREATE INDEX IF NOT EXISTS idx_torrents_category ON torrents((json_extract(qb_torrent, '$.category')));
CREATE INDEX IF NOT EXISTS idx_torrents_deleted ON torrents(is_deleted);

-- ============================================================================
-- 索引 - torrent_files
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_files_torrent_id ON torrent_files(torrent_id);
CREATE INDEX IF NOT EXISTS idx_files_deleted ON torrent_files(is_deleted);

-- ============================================================================
-- 索引 - volumes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_volumes_torrent_id ON volumes(torrent_id);
CREATE INDEX IF NOT EXISTS idx_volumes_type ON volumes(type);
CREATE INDEX IF NOT EXISTS idx_volumes_catalog_no ON volumes(catalog_no);
CREATE INDEX IF NOT EXISTS idx_volumes_volume_name ON volumes(volume_name);
CREATE INDEX IF NOT EXISTS idx_volumes_deleted ON volumes(is_deleted);
CREATE INDEX IF NOT EXISTS idx_volumes_volume_no ON volumes(volume_no);
