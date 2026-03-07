export interface Torrent {
    id?: string
    hash: string
    added_on: number
    is_deleted: boolean
    synced_at: number
    // Flat QB torrent fields
    name?: string
    magnet_uri?: string
    size?: number
    progress?: number
    dlspeed?: number
    upspeed?: number
    priority?: number
    num_seeds?: number
    num_complete?: number
    num_leechs?: number
    num_incomplete?: number
    ratio?: number
    eta?: number
    state?: string
    seq_dl?: boolean
    f_l_piece_prio?: boolean
    completion_on?: number
    tracker?: string
    trackers_count?: number
    dl_limit?: number
    up_limit?: number
    downloaded?: number
    uploaded?: number
    downloaded_session?: number
    uploaded_session?: number
    amount_left?: number
    save_path?: string
    completed?: number
    max_ratio?: number
    max_seeding_time?: number
    ratio_limit?: number
    seeding_time_limit?: number
    super_seeding?: boolean
    seen_complete?: number
    last_activity?: number
    total_size?: number
    time_active?: number
    category?: string
    tags?: string
    content_path?: string
    auto_tmm?: boolean
    availability?: number
    force_start?: boolean
    is_private?: boolean
    reannounce?: number
    seeding_time?: number
}

export interface TorrentWithVolume extends Torrent {
    hasVolumes?: boolean
    volumeCount?: number
}

export interface StoredFile {
    id: string
    torrent_id?: string
    is_deleted: boolean
    synced_at: number
    // Flat QB file fields
    name: string
    size?: number
    progress?: number
    priority?: number
    is_seed?: boolean
    piece_range?: [number, number] | null
    availability?: number
}

export interface TorrentRecord extends Torrent {
    id: string
    files: StoredFile[]
}

export interface Volume {
    id: string
    torrent_id: string
    torrent_file_ids: string[]
    volume_no: number
    catalog_no: string
    volume_name?: string
    is_deleted: boolean
    updated_at: number
    files?: StoredFile[]
}

export interface VolumeForm {
    catalog_no: string
    volume_name: string
}

export type MediaType = 'bd' | 'dvd' | 'cd' | 'scan'

export interface Media {
    id: string
    volume_id: string
    media_no: number
    media_type: MediaType
    content_title?: string       // 内容标题
    description?: string         // 说明
    torrent_file_ids: string[]
    is_deleted: boolean
    updated_at: number
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
