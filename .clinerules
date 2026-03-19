# GitHub Copilot Instructions for BDDB Project

This file provides context and guidelines for GitHub Copilot when working with the BDDB codebase.

## Project Overview

BDDB is a Next.js 16 + React 19 + TypeScript torrent/disc management system for organizing qBittorrent downloads into
disc/BOX volumes. It uses **MongoDB** for persistence and Ant Design 6 for the UI.

### Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5.9
- **UI Library**: Ant Design 6 + @ant-design/icons
- **Storage**: MongoDB via `mongodb` driver
- **qBittorrent Client**: @ctrl/qbittorrent
- **ID**: MongoDB ObjectId

### Project Structure

```
BDDB/
├── app/                    # Next.js App Router
│   ├── api/                # API routes
│   │   ├── qb/torrents/    # qBittorrent proxy APIs (sync/info/files/delete/rebuild)
│   │   ├── store/flush/    # Persistence flush no-op API
│   │   ├── torrents/files/ # Torrent file query API
│   │   └── volumes/        # Volume & media management APIs
│   ├── config/             # Configuration page
│   ├── series/             # Series management page
│   ├── storage/            # Data management page
│   ├── torrents/           # Torrent list page
│   ├── volume/             # Volume management page
│   ├── work/               # Work management page
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout (Ant Design ConfigProvider + nav menu)
│   └── page.tsx            # Home — redirects to /torrents
├── components/             # Shared React components
│   ├── DiscEditor/         # Disc editor (VolumeFormList.tsx)
│   ├── DiscEditor.tsx      # Disc editor entry component
│   ├── MediaEditor.tsx     # Media editor component
│   ├── CollapsePageList.tsx
│   ├── ListPagination.tsx
│   └── useEditorPanel.ts   # Shared editor panel hook
├── lib/                    # Utility libraries
│   ├── mongodb/            # MongoDB storage module
│   │   ├── index.ts        # Entry point (re-exports connection + repositories)
│   │   ├── connection.ts   # MongoDB connection helpers
│   │   ├── bddbRepository.ts # BDDB CRUD + types
│   │   └── productRepository.ts # Product-related repository
│   ├── api.ts              # Frontend API utilities (fetchApi, postApi)
│   ├── utils.ts           # Shared utilities (PAGE_SIZE, formatSize, buildTree, FlatTree, NodePath)
│   └── qb.ts               # qBittorrent client wrapper + sync logic
└── data/                   # Local data directory (optional)
```

## Storage Architecture

### MongoDB Database (`lib/mongodb/connection.ts`)

MongoDB connection is managed via a global singleton `MongoClient`.

```typescript
import {getMongoCollection} from '@/lib/mongodb';

const torrents = getMongoCollection('bddb_torrents');
const rows = await torrents.find({is_deleted: false}).toArray();
```

**Always import from `@/lib/mongodb`** — do not use removed `@/lib/db`.

### Tables

| Table           | Description                          |
|-----------------|--------------------------------------|
| `torrents`      | Torrent metadata (flat QB fields)    |
| embedded `files` in `bddb_torrents` | Files belonging to a torrent |
| `bddb_volumes`  | Disc/BOX volume metadata             |
| `bddb_medias`   | Media entries within a volume        |

### Repository Pattern

Use functions from `lib/mongodb/bddbRepository.ts` — prefer them over ad-hoc queries in API routes:

```typescript
import {getAllTorrents, saveVolumeCompat} from '@/lib/mongodb';

const torrents = await getAllTorrents();
await saveVolumeCompat(torrentId, fileIds, data);
```

## Type System

### Single Source of Truth

- **All types are defined in `lib/mongodb/bddbRepository.ts`**
- Frontend, backend, and storage use the **same types**
- **Never create duplicate types** in other files
- Always import from `@/lib/mongodb`

### Core Types

| Type                | Description                                        |
|---------------------|----------------------------------------------------|
| `BddbTorrent`       | Torrent record (QB fields + metadata + files[])    |
| `TorrentWithVolume` | Frontend torrent view with volume summary           |
| `BddbTorrentFile`   | Embedded file record inside torrent                 |
| `BddbVolume`        | Disc/BOX volume metadata                            |
| `VolumeForm`        | Form data for volume editing                       |
| `MediaType`         | `'bd' \| 'dvd' \| 'cd' \| 'scan'`                  |
| `BddbMedia`         | Media entry within a volume                        |
| `MediaForm`         | Form data for media editing                        |
| `NodeData`          | Per-tree-node assignment state                     |
| `FileItem`          | Simplified file for editor tree display            |

## API Conventions

### Runtime & Response Format

- **All API routes use Node.js runtime** (not Edge)
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
    return NextResponse.json({
      success: true,
      data: JSON.stringify(torrents),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
```

## Component Guidelines

### Client Components

- Use `'use client'` only for **client boundaries** (page/layout entry or module that must run in browser)
- Do **not** add `'use client'` to every child component by default if it is only imported inside an existing client
  boundary
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

## Naming Conventions

- **Components**: PascalCase (e.g., `DiscEditor.tsx`)
- **Utilities**: camelCase (e.g., `api.ts`, `useDiscEditor.ts`)
- **API Routes**: `route.ts` in folder
- **Storage Fields**: snake_case (e.g., `is_deleted`, `synced_at`)
- **TypeScript**: camelCase for variables/functions, PascalCase for types/interfaces
- **Path Alias**: `@/` refers to project root

## Development Workflow

### Build & Run

```bash
npm run dev      # Development server (http://localhost:3000)
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint
```

### Environment Variables

Configure in `.env.local`:

```env
QB_HOST=localhost:18000    # qBittorrent WebUI address
QB_USER=admin              # qBittorrent username
QB_PASS=password           # qBittorrent password
```

## Key Files Reference

- `lib/mongodb/bddbRepository.ts` — BDDB type definitions + CRUD operations
- `lib/mongodb/connection.ts` — MongoDB connection helpers
- `lib/mongodb/index.ts` — Entry point (import everything from here via `@/lib/mongodb`)
- `lib/api.ts` — Frontend API utilities (fetchApi, postApi)
- `lib/utils.ts` — Shared utilities (PAGE_SIZE, formatSize, buildTree, FlatTree, NodePath)
- `lib/qb.ts` — qBittorrent client (getQbClient, syncTorrentsFromQb)
