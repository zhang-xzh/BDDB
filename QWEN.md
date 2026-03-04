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
├── torrents.nedb  # qBittorrent data + files array + is_deleted
└── volumes.nedb   # Disc metadata (catalog_no, suruga_id, volume_no, etc.)
```

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
- `GET /api/qb/torrents/files?hash=` - Get files
- `GET /api/torrents/files?hash=` - Get files from DB

### Volumes
- `GET /api/volumes?torrent_hash=&box_id=` - List volumes
- `POST /api/volumes` - Add volumes
- `GET /api/torrents/bd-info?hash=` - Get BD info
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
  files: TorrentFile[]
  is_deleted: boolean
  synced_at: number
}
```

### Volume
```typescript
{
  torrent_hash, box_id, type, volume_no, sort_order,
  catalog_no, suruga_id, note,
  title?, release_date?, maker?, version_type?, bonus_status?,
  created_at, updated_at
}
```
