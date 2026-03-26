/**
 * 扩展 @ctrl/qbittorrent 的类型定义
 * 补充 qBittorrent v5.0 新增但包中未包含的字段
 */

declare module "@ctrl/qbittorrent" {
    interface Torrent {
        /**
         * Download path for incomplete torrents
         * Added in qBittorrent WebUI API v2.8.4
         */
        download_path?: string;

        /**
         * v1 infohash for hybrid and v1 torrents
         * Added in qBittorrent v5.0.0
         */
        infohash_v1?: string;

        /**
         * v2 infohash for hybrid and v2 torrents
         * Added in qBittorrent v5.0.0
         */
        infohash_v2?: string;

        /**
         * Torrent comment
         */
        comment?: string;

        /**
         * Whether the torrent has metadata
         */
        has_metadata?: boolean;

        /**
         * Inactive seeding time limit
         */
        inactive_seeding_time_limit?: number;

        /**
         * Maximum inactive seeding time
         */
        max_inactive_seeding_time?: number;

        /**
         * Torrent popularity (availability * number of seeds)
         */
        popularity?: number;

        /**
         * Whether torrent is from a private tracker
         * Note: API returns 'private', but type definition uses 'isPrivate'
         */
        private?: boolean;

        /**
         * Root path of the torrent content
         */
        root_path?: string;
    }

    interface TorrentFile {
        /**
         * File index in the torrent
         */
        index: number;
    }
}

export {};
