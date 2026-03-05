// ============================================================================
// BDDB Schema Definitions
// All types extend from @ctrl/qbittorrent for type consistency
// ============================================================================

import type { Torrent as QbTorrent, TorrentFile as QbTorrentFile } from '@ctrl/qbittorrent'

// ============================================================================
// Database Types (extend from @ctrl/qbittorrent)
// ============================================================================

/**
 * Torrent - 种子元数据
 * Extends @ctrl/qbittorrent Torrent type
 * _id 和 qb_torrent 里的 hash/category/name/state 需要索引
 */
export interface Torrent {
  _id?: string
  qb_torrent: QbTorrent           // JSON: 所有 QbTorrent 字段
  is_deleted: boolean
  synced_at: number
}

/**
 * TorrentFile - 种子文件
 * Extends @ctrl/qbittorrent TorrentFile type
 * _id 需要索引
 */
export interface TorrentFile {
  _id?: string
  torrent_id: string
  qb_torrent_file: QbTorrentFile
  is_deleted: boolean
  synced_at: number
}

/**
 * Volume - 光盘/BOX 元数据
 * _id/type/catalog_no/volume_name 需要索引
 */
export interface Volume {
  _id?: string
  torrent_id: string
  torrent_file_ids: string[]
  type: 'volume' | 'box'
  volume_no: number
  sort_order: number
  volume_name?: string
  catalog_no: string
  suruga_id: string
  note: string
  title?: string
  release_date?: string
  maker?: string
  version_type?: string
  bonus_status?: string
  is_deleted?: boolean
  created_at: number
  updated_at: number
}

// ============================================================================
// Frontend Component Types
// ============================================================================

/**
 * Stats - 统计信息
 */
export interface Stats {
  total: number
  downloading: number
  seeding: number
  paused: number
  total_size: number
}

/**
 * VolumeForm - 卷表单数据
 */
export interface VolumeForm {
  catalog_no: string
  volume_name: string
}

/**
 * NodeData - 树节点数据
 */
export interface NodeData {
  volume_no?: number
  files?: string[]
}

/**
 * FileItem - 文件列表项
 */
export interface FileItem {
  _id?: string
  name: string
  size: number
  progress: number
}

/**
 * QueryCondition - 查询条件
 */
export interface QueryCondition {
  [key: string]: any
}
