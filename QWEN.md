# BDDB Project Docs

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Nuxt 3 (Vue 3) |
| Language | TypeScript |
| UI | Ant Design Vue 4 |
| Database | NeDB (@seald-io/nedb) |
| Downloader | qBittorrent (@ctrl/qbittorrent) |

## Project Structure

```
C:\APP\BDDB\
├── app.vue
├── nuxt.config.ts
├── package.json
├── docs/
│   └── data-schema.md
├── components/
│   └── DiscEditor.vue
├── pages/
│   └── index.vue
└── server/
    ├── db/
    │   ├── index.ts
    │   ├── schema.ts
    │   └── repository.ts
    ├── qb.ts
    └── api/
        ├── qb/
        ├── torrents/
        └── volumes/
```

## Database

```
data/
├── torrents.nedb  # Torrent metadata (_id, hash, name, size, state, etc.)
├── files.nedb     # Torrent files (torrent_id, name, size, index, piece_range, etc.)
└── volumes.nedb   # Disc metadata (torrent_id, files[], volume_no, catalog_no, etc.)
```

### Data Relations
- `Torrent._id` → `TorrentFile.torrent_id` (one-to-many)
- `Torrent._id` → `Volume.torrent_id` (one-to-many)
- `TorrentFile._id` → `Volume.files[]` (many-to-many via array reference)

## Commands

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run preview
```

## Env Config

```bash
QB_HOST=localhost:18000
QB_USER=admin
QB_PASS=password
```

## API Endpoints

### Torrents
- `GET /api/qb/torrents/info?state=&search=` - List torrents
- `GET /api/qb/torrents/stats` - Statistics
- `POST /api/qb/torrents/sync` - Sync from qBittorrent
- `POST /api/qb/torrents/delete?hash=` - Soft delete
- `GET /api/qb/torrents/files?hash=` - Get files from qBittorrent and save to DB
- `GET /api/torrents/files?hash=` - Get files from DB

### Volumes
- `GET /api/volumes?torrent_id=&box_id=` - List volumes
- `POST /api/volumes` - Add/update volumes
- `GET /api/torrents/bd-info?torrent_file_id=` - Get BD info by file ID
- `POST /api/torrents/bd-info?hash=` - Save BD info

### Response Format
```json
{ "success": true, "data": "..." }
```

## Conventions

- TypeScript strict mode
- `<script setup lang="ts">`
- Composition API
- Auto-import components
- **No `../..` in imports** - use `#server/` or `~` aliases
- **Same field names** - frontend/backend/DB share identical types from `schema.ts`
- **No direct node process manipulation**
- **No auto-start dev mode** - use `npm run build` to verify errors
- TDD

## Data Schema

### Torrent (extends @ctrl/qbittorrent)
```typescript
import { Torrent as QbTorrent } from '@ctrl/qbittorrent'

interface Torrent extends QbTorrent {
  _id?: string
  is_deleted: boolean
  synced_at: number
}
```

### TorrentFile (extends @ctrl/qbittorrent)
```typescript
import { TorrentFile as QbTorrentFile } from '@ctrl/qbittorrent'

interface TorrentFile extends QbTorrentFile {
  _id?: string
  torrent_id: string  // Reference to Torrent._id
  is_deleted: boolean
  synced_at: number
}
```

### Volume
```typescript
{
  _id?: string
  torrent_id: string    // Reference to Torrent._id
  files: string[]       // Array of TorrentFile._id
  type: 'volume' | 'box'
  volume_no: number
  sort_order: number
  volume_name?: string
  catalog_no: string
  suruga_id: string
  note: string
  created_at: number
  updated_at: number
}
```
