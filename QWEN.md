# BDDB Project Docs

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (React 19) |
| Language | TypeScript |
| UI | Ant Design 6 |
| Database | NeDB (@seald-io/nedb) |
| Downloader | qBittorrent (@ctrl/qbittorrent) |

## Project Structure

```
C:\APP\BDDB\
├── app/
│   ├── api/              # API Routes (Node.js runtime)
│   │   ├── qb/
│   │   │   └── torrents/
│   │   ├── torrents/
│   │   └── volumes/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx          # Home page
├── components/
│   ├── DiscEditor.tsx    # Disc editor modal
│   └── Providers.tsx     # Ant Design provider
├── lib/
│   ├── db/
│   │   ├── index.ts      # NeDB connection
│   │   ├── repository.ts # Data operations
│   │   └── schema.ts     # Type definitions (统一类型定义)
│   ├── api.ts            # Client API client
│   ├── api-server.ts     # Server API utilities
│   └── qb.ts             # qBittorrent client
├── data/                 # NeDB data files
├── next.config.ts
├── package.json
├── tsconfig.json
└── .env.local            # Environment variables
```

## Database

```
data/
├── torrents.nedb  # Torrent metadata (_id, hash, name, size, state, etc.)
├── files.nedb     # Torrent files (torrent_id, name, size, piece_range, etc.)
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
npm run start
```

## Env Config

```bash
# .env.local
QB_HOST=localhost:18000
QB_USER=admin
QB_PASS=password
```

## API Endpoints

### Torrents
- `GET /api/qb/torrents/info?state=&search=&hash=` - List torrents
- `GET /api/qb/torrents/stats` - Statistics
- `POST /api/qb/torrents/sync` - Sync from qBittorrent
- `POST /api/qb/torrents/delete?hash=` - Soft delete
- `GET /api/qb/torrents/files?hash=` - Get files from qBittorrent and save to DB
- `GET /api/torrents/files?hash=` - Get files from DB

### Volumes
- `GET /api/volumes?torrent_id=&torrent_file_id=` - List volumes
- `POST /api/volumes` - Add/update volumes

### Response Format
```json
{ "success": true, "data": "..." }
```

## Conventions

- TypeScript strict mode
- `'use client'` for client components
- Ant Design 6 components
- Auto-import paths via tsconfig.json
- API routes use Node.js runtime (not Edge)
- **统一类型定义**: 所有类型在 `lib/db/schema.ts` 中定义
- **No auto-start dev mode** - use `npm run build` to verify errors

## Data Schema

所有类型定义在 `lib/db/schema.ts` 中：

### Torrent (扩展自 @ctrl/qbittorrent)
```typescript
interface Torrent {
  _id?: string
  hash: string
  name: string
  size: number
  progress: number
  state: string
  num_seeds: number
  num_leechs: number
  added_on: number
  is_deleted: boolean
  synced_at: number
}
```

### TorrentFile (扩展自 @ctrl/qbittorrent)
```typescript
interface TorrentFile {
  _id?: string
  torrent_id: string  // Reference to Torrent._id
  name: string
  size: number
  progress: number
  is_deleted: boolean
  synced_at: number
}
```

### Volume
```typescript
interface Volume {
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

### 前端组件类型
```typescript
// 统计信息
interface Stats {
  total: number
  downloading: number
  seeding: number
  paused: number
  total_size: number
}

// 卷表单数据
interface VolumeForm {
  catalog_no: string
  volume_name: string
}

// 树节点数据
interface NodeData {
  volume_no?: number
  files?: string[]
}

// 文件列表项
interface FileItem {
  _id?: string
  name: string
  size: number
  progress: number
}
```
