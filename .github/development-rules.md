# BDDB Development Rules

## Type System

### Type Consistency

- Frontend/backend/storage use **same types** from `lib/mongodb/bddbRepository.ts`
- Field names must be **identical** across all layers
- **Never create duplicate types** in other files
- Always import types from `@/lib/mongodb`

### Core Types

| Type                | Description                                        |
|---------------------|----------------------------------------------------|
| `BddbTorrent`       | Torrent record (flat QB fields + metadata)         |
| `TorrentWithVolume` | `Torrent` extended with `hasVolumes`/`volumeCount` |
| `BddbTorrentFile`   | Embedded file record in torrent.files              |
| `BddbVolume`        | Disc/BOX metadata                                  |
| `VolumeForm`        | Form data for volume editing                       |
| `MediaType`         | `'bd' \| 'dvd' \| 'cd' \| 'scan'`                  |
| `BddbMedia`         | Media entry within a volume                        |
| `MediaForm`         | Form data for media editing                        |
| `NodeData`          | Per-tree-node assignment state                     |
| `FileItem`          | Simplified file for editor tree display            |

## Storage Conventions

### Architecture

- **Storage**: MongoDB via `mongodb` driver
- **Connection**: `lib/mongodb/connection.ts` — `getMongoClient()` returns a global singleton
- **Pattern**: Repository pattern in `lib/mongodb/bddbRepository.ts`
- **Required fields**: All records must include `is_deleted: boolean` and `updated_at: number` (volumes/medias) or `synced_at: number` (torrents/files)

### Repository Functions

Key functions exported from `lib/mongodb/bddbRepository.ts`:

```typescript
// Torrents
getTorrent(hash)                          // → Torrent | null
getTorrentByHash(hash)                    // → BddbTorrent | null
getAllTorrents(includeDeleted ?)           // → BddbTorrent[]
upsertTorrent(record
:
BddbTorrent
)
softDeleteTorrent(hash)

// Torrent Files
saveTorrentFiles(torrentId, files)        // updates embedded files
getTorrentFilesAsFileItems(torrentId)     // → FileItem[]
softDeleteTorrentFiles(torrentId)

// Volumes
getAllVolumes(torrentId ?)              // → BddbVolume[]
getVolumesByTorrentId(torrentId)       // → BddbVolume[]
getVolumeCounts()                      // → Map<torrentId, count>
saveVolumeCompat(torrentId, files, data)
deleteStaleVolumes(torrentId, keepVolumeNos)

// Medias
getMediasByVolumeId(volumeId)          // → BddbMedia[]
saveMediaCompat(volumeId, files, data)
deleteStaleMedias(volumeId, keepMedias)

// Misc
clearAllData()
```

### Accessing the Database

Always import from `@/lib/mongodb`:

```typescript
import {getMongoCollection, getAllTorrents, saveVolumeCompat} from '@/lib/mongodb';

const torrentsCollection = getMongoCollection('bddb_torrents');
const rows = await torrentsCollection.find({is_deleted: false}).toArray();

// Prefer repository functions when available
const torrents = await getAllTorrents();
await saveVolumeCompat(torrentId, fileIds, data);
```

### Store Flush API

The `store/flush` API is a no-op in MongoDB mode and returns success for compatibility.

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
- Use MUI (Material UI) components
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

### Styling — MUI First

- **MUI components and their built-in props are the highest priority** for layout and styling
- Target **zero custom CSS** and **zero raw `<div>`** — use MUI layout primitives instead:
    - `<Box sx={{display:'flex'}}>` / `<Stack>` for alignment and gaps
    - `<Grid>` for grid layout
    - `<Typography>` for text
    - `sx` prop only as last resort for values MUI doesn't expose via props
- Never write a `<div>` when a MUI component (`Card`, `Stack`, `Box`, `Paper`, etc.) can serve the same
  purpose
- Prefer MUI component props over `sx` hacks targeting internal class names (e.g. use `color="warning"` not `sx={{'& .MuiOutlinedInput-notchedOutline': ...}}`)
- Use `variant="outlined"` / `disableGutters` / `color` props instead of manual border or color overrides

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
- **Type safety**: Use type assertions from `lib/mongodb/bddbRepository.ts`
- **Consistency**: Follow existing patterns in the codebase

## Key Reference Files

- `lib/mongodb/bddbRepository.ts` — Type definitions + CRUD operations
- `lib/mongodb/connection.ts` — MongoDB connection helpers
- `lib/mongodb/util.ts` — Entry point (import everything from here via `@/lib/mongodb`)
- `lib/api.ts` — Frontend API utilities (fetchApi, postApi)
- `lib/utils.ts` — Shared utilities (PAGE_SIZE, formatSize, buildTree, FlatTree, NodePath)
- `lib/qb.ts` — qBittorrent client (getQbClient, syncTorrentsFromQb)
