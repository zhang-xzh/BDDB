import type { Torrent as QbTorrent, TorrentFile as QbTorrentFile } from '@ctrl/qbittorrent'

export interface Torrent extends QbTorrent {
  _id?: string
  files: QbTorrentFile[]
  is_deleted: boolean
  synced_at: number
}

export interface Volume {
  _id?: string
  torrent_hash: string
  box_id: string
  type: 'volume' | 'box'
  volume_no: number
  sort_order: number
  catalog_no: string
  suruga_id: string
  note: string
  title?: string
  release_date?: string
  maker?: string
  version_type?: string
  bonus_status?: string
  created_at: number
  updated_at: number
}

export interface QueryCondition { [key: string]: any }
