// ============================================================================
// BDDB Schema Definitions
// ============================================================================

import type {
  Torrent as QbTorrent,
  TorrentFile as QbTorrentFile,
} from "@ctrl/qbittorrent";

// ============================================================================
// Storage Types
// ============================================================================

/** Torrent - API/前端层 */
export interface Torrent {
  id?: string;
  qb_torrent: QbTorrent;
  is_deleted: boolean;
  synced_at: number;
}

/** TorrentFile - API/前端层 */
export interface TorrentFile {
  id?: string;
  torrent_id: string;
  qb_torrent_file: QbTorrentFile;
  is_deleted: boolean;
  synced_at: number;
}

/** StoredFile - 嵌入在 TorrentRecord 中的文件 */
export interface StoredFile {
  id: string;
  qb_torrent_file: QbTorrentFile;
  is_deleted: boolean;
  synced_at: number;
}

/** TorrentRecord - 文件存储格式（每 torrent 一个 JSON 文件） */
export interface TorrentRecord {
  id: string;
  hash: string;
  added_on: number;
  qb_torrent: QbTorrent;
  is_deleted: boolean;
  synced_at: number;
  files: StoredFile[];
}

/** Volume - 光盘/BOX 元数据 */
export interface Volume {
  id: string;
  torrent_id: string;
  torrent_file_ids: string[];
  type?: "volume" | "box";
  volume_no: number;
  catalog_no: string;
  volume_name?: string;
  media_type?: "DVD" | "BD";
  is_deleted: boolean;
  updated_at: number;
}

// ============================================================================
// Frontend Component Types
// ============================================================================

export interface Stats {
  total: number;
  downloading: number;
  seeding: number;
  paused: number;
  total_size: number;
}

export interface VolumeForm {
  catalog_no: string;
  volume_name: string;
  type?: "volume" | "box";
  media_type?: "DVD" | "BD";
}

export interface NodeData {
  volume_no?: number;
  shared_volume_nos?: number[];
  files?: string[];
}

export interface FileItem {
  id?: string;
  name: string;
  size: number;
  progress: number;
}

export interface QueryCondition {
  [key: string]: any;
}
