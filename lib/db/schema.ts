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
 */
export interface Torrent extends QbTorrent {
  _id?: string
  is_deleted: boolean
  synced_at: number
}

/**
 * TorrentFile - 种子文件
 * Extends @ctrl/qbittorrent TorrentFile type
 */
export interface TorrentFile extends QbTorrentFile {
  _id?: string
  torrent_id: string
  is_deleted: boolean
  synced_at: number
}

/**
 * Volume - 光盘/BOX 元数据
 */
export interface Volume {
  _id?: string
  torrent_id: string
  files: string[]
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
