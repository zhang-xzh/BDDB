# BDDB Development Rules

## Type System

### Type Consistency

- Frontend/backend/storage use **same types** from `lib/db/schema.ts`
- Field names must be **identical** across all layers
- **Never create duplicate types** in other files
- Always import types from `@/lib/db` (re-exports schema)

### Core Types

| Type                | Description                                        |
|---------------------|----------------------------------------------------|
| `Torrent`           | Torrent record (flat QB fields + metadata)         |
| `TorrentWithVolume` | `Torrent` extended with `hasVolumes`/`volumeCount` |
| `TorrentRecord`     | `Torrent` + embedded `files[]` (for upsert)        |
| `StoredFile`        | File record (in torrent_files table)               |
| `Volume`            | Disc/BOX metadata + optional `files[]`             |
| `VolumeForm`        | Form data for volume editing                       |
| `MediaType`         | `'bd' \| 'dvd' \| 'cd' \| 'scan'`                  |
| `Media`             | Media entry within a volume                        |
| `MediaForm`         | Form data for media editing                        |
| `NodeData`          | Per-tree-node assignment state                     |
| `FileItem`          | Simplified file for editor tree display            |

## Storage Conventions

### Architecture

- **Storage**: SQLite via `better-sqlite3` (WAL mode, single file `data/bddb.sqlite`)
- **Connection**: `lib/db/connection.ts` — `getDb()` returns a global singleton
- **Pattern**: Repository pattern in `lib/db/repository.ts`
- **Required fields**: All records must include `is_deleted: boolean` and `updated_at: number` (volumes/medias) or `synced_at: number` (torrents/files)

### Repository Functions

Key functions exported from `lib/db/repository.ts`:

```typescript
// Torrents
getTorrent(hash)                          // → Torrent | null
getTorrentByHash(hash)                    // → TorrentRecord | null
getAllTorrents(includeDeleted?)           // → Torrent[]
getAllTorrentsWithFiles(includeDeleted?)  // → (Torrent & {files})[]
upsertTorrent(record: TorrentRecord)
softDeleteTorrent(hash)

// Torrent Files
saveTorrentFiles(torrentId, files)
getTorrentFilesAsFileItems(torrentId)    // → FileItem[]
softDeleteTorrentFiles(torrentId)

// Volumes
getAllVolumes(torrentId?)               // → Volume[]
getVolumesByTorrent(torrentId)         // → Volume[]
getVolumesByFile(fileId)               // → Volume[]
getVolumeCounts()                      // → Map<torrentId, count>
saveVolume(torrentId, files, data)
deleteStaleVolumes(torrentId, keepVolumeNos)

// Medias
getMediasByVolume(volumeId)            // → Media[]
saveMedia(volumeId, files, data)
deleteStaleMedias(volumeId, keepMedias)

// Misc
clearAllData()
```

### Accessing the Database

Always import from `@/lib/db` — never import directly from `@/lib/db/connection`:

```typescript
import {getDb, getAllTorrents, saveVolume} from '@/lib/db';

// Raw SQL when repository functions don't cover the use case
const db = getDb();
const rows = db.prepare('SELECT * FROM torrents WHERE is_deleted = 0').all();

// Prefer repository functions when available
const torrents = await getAllTorrents();
await saveVolume(torrentId, fileIds, data);
```

### WAL Checkpoint

The `store/flush` API triggers a WAL checkpoint (`PASSIVE` mode) to merge WAL into the main database file.
SQLite WAL writes are durable without checkpoint — checkpoint is optional maintenance.

## API Conventions

### Runtime & Response Format

- API routes use **Node.js runtime** (not Edge)
- Standard response format:

```typescript
interface FetchResponse<T> {
  success: boolean;
  data?: T;        // JSON stringified
  error?: string;
}
```

### Example API Route

```typescript
export const runtime = 'nodejs';

export async function GET() {
  try {
    const torrents = await getAllTorrents();
    return NextResponse.json({ success: true, data: JSON.stringify(torrents) });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

## Component Conventions

- Use `'use client'` only for client boundaries (page/layout entry or modules that must run in browser)
- Do not add `'use client'` to every child module under an existing client boundary
- Use React 19 hooks: `useState`, `useEffect`, `useCallback`, `useRef`
- Use Ant Design 6 components
- **No direct DOM manipulation**

### File Consolidation — Fewer Files is Better

- **Do not split files just for the sake of separation.** Only create a new file when the code is genuinely reused
  elsewhere or is large enough to justify it (guideline: >400 lines after consolidation).
- Hooks that are **only used by one component** belong in the same file as that component — do not extract them to a
  separate `useXxx.ts` unless they are shared.
- Small helper components (< ~80 lines) that are **only rendered by one parent** belong in the same file as the parent —
  do not extract them.
- Internal `interface`/`type` definitions that are only used within one file stay in that file — do not create a
  separate `types.ts`.
- Pure utility functions (e.g. tree building, formatting) that are tightly coupled to one feature belong in the same
  file unless they are reused.
- Only extract to a separate file when: (a) the code is shared by multiple files, or (b) the single file would exceed ~
  600 lines.
- Keep `app/page.tsx` and `app/layout.tsx` as thin composition/orchestration layers.

### Styling — Ant Design First

- **Ant Design components and their built-in props are the highest priority** for layout and styling
- Target **zero custom CSS** and **zero raw `<div>`** — use Ant Design layout primitives instead:
    - `<Flex>` / `<Space>` for alignment and gaps
    - `<Row>` / `<Col>` for grid layout
    - `<Typography.Text>`, `<Typography.Title>` for text
    - `style` prop only as last resort for values Ant Design doesn't expose
- Never write a `<div>` when an Ant Design component (`Card`, `Flex`, `Space`, `Layout`, etc.) can serve the same
  purpose

## File Naming Conventions

- **Components**: PascalCase (e.g., `DiscEditor.tsx`)
- **Utilities**: camelCase (e.g., `api.ts`, `useDiscEditor.ts`)
- **API Routes**: `route.ts` in folder
- **Storage Fields**: snake_case (e.g., `is_deleted`, `synced_at`)
- **TypeScript**: camelCase for variables/functions, PascalCase for types/interfaces
- **Path Alias**: `@/` refers to project root

## Build & Run

```bash
npm run dev      # Development server (http://localhost:3000)
npm run build    # Production build (always verify before commit)
npm run start    # Production server
npm run lint     # ESLint
```

## Environment Variables

Configure in `.env.local`:

```env
QB_HOST=localhost:18000    # qBittorrent WebUI address
QB_USER=admin              # qBittorrent username
QB_PASS=password           # qBittorrent password
```

## Code Quality Standards

- **TypeScript strict mode**: Minimize `any` types
- **Error boundaries**: Always handle potential errors
- **Type safety**: Use type assertions from `lib/db/schema.ts`
- **Consistency**: Follow existing patterns in the codebase

## Key Reference Files

- `lib/db/schema.ts` — Type definitions (single source of truth)
- `lib/db/connection.ts` — SQLite connection + schema init
- `lib/db/repository.ts` — CRUD operations
- `lib/db/index.ts` — Entry point (import everything from here via `@/lib/db`)
- `lib/api.ts` — Frontend API utilities (fetchApi, postApi)
- `lib/utils.ts` — Shared utilities (PAGE_SIZE, formatSize, buildTree, FlatTree, NodePath)
- `lib/qb.ts` — qBittorrent client (getQbClient, syncTorrentsFromQb)
