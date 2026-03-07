# GitHub Copilot Instructions for BDDB Project

This file provides context and guidelines for GitHub Copilot when working with the BDDB codebase.

## Project Overview

BDDB is a Next.js 16 + React 19 + TypeScript torrent/disc management system for organizing qBittorrent downloads into
disc/BOX volumes. It uses **SQLite (better-sqlite3, WAL mode)** for persistence and Ant Design 6 for the UI.

### Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5.9
- **UI Library**: Ant Design 6 + @ant-design/icons
- **Storage**: SQLite via `better-sqlite3` (WAL mode, single file `data/bddb.sqlite`)
- **qBittorrent Client**: @ctrl/qbittorrent
- **ID Generation**: nanoid

### Project Structure

```
C:\APP\BDDB\
├── app/                    # Next.js App Router
│   ├── api/                # API routes
│   │   ├── qb/             # qBittorrent APIs
│   │   ├── store/          # Store management APIs (WAL checkpoint)
│   │   ├── torrents/       # Torrent management APIs
│   │   └── volumes/        # Volume management APIs
│   ├── config/             # Configuration page
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout (Ant Design ConfigProvider)
│   └── page.tsx            # Home page (torrent list)
├── components/             # React components
├── lib/                    # Utility libraries
│   ├── db/                 # Storage module
│   │   ├── index.ts        # Entry point (re-exports schema + repository + getDb)
│   │   ├── connection.ts   # SQLite connection + schema init (getDb)
│   │   ├── repository.ts   # Data access layer (CRUD)
│   │   └── schema.ts       # TypeScript type definitions
│   ├── api.ts              # Frontend API utilities (fetchApi, postApi)
│   ├── format.ts           # Shared utilities (PAGE_SIZE, formatSize, buildTree)
│   └── qb.ts               # qBittorrent client wrapper + sync logic
└── data/                   # Local data directory
    └── bddb.sqlite         # SQLite database
```

## Storage Architecture

### SQLite Database (`lib/db/connection.ts`)

A single SQLite file at `data/bddb.sqlite`. The connection is a global singleton (reused across requests in the
same Node.js process). Schema is auto-created on first connection.

```typescript
import {getDb} from '@/lib/db';

const db = getDb();
const rows = db.prepare('SELECT * FROM torrents WHERE is_deleted = 0').all();
```

**Always import `getDb` from `@/lib/db`** — never import directly from `@/lib/db/connection`.

### Tables

| Table           | Description                                       |
|-----------------|---------------------------------------------------|
| `torrents`      | Torrent metadata (flat QB fields)                 |
| `torrent_files` | Files belonging to a torrent                      |
| `volumes`       | Disc/BOX volume metadata                          |
| `volume_files`  | Many-to-many: volume ↔ torrent_files              |
| `medias`        | Media entries within a volume                     |
| `media_files`   | Many-to-many: media ↔ torrent_files               |

### Repository Pattern

Use functions from `lib/db/repository.ts` — prefer them over raw SQL in API routes:

```typescript
import {getAllTorrents, saveVolume} from '@/lib/db';

const torrents = await getAllTorrents();
await saveVolume(torrentId, fileIds, data);
```

## Type System

### Single Source of Truth

- **All types are defined in `lib/db/schema.ts`**
- Frontend, backend, and storage use the **same types**
- **Never create duplicate types** in other files
- Always import from `@/lib/db` (re-exports schema)

### Core Types

| Type            | Description                              |
|-----------------|------------------------------------------|
| `TorrentRecord` | Torrent + embedded files (for upsert)    |
| `Torrent`       | API/frontend view of a torrent           |
| `StoredFile`    | File record (in torrent_files table)     |
| `Volume`        | Disc/BOX metadata                        |
| `VolumeForm`    | Form data for volume editing             |
| `Media`         | Media entry within a volume              |
| `MediaForm`     | Form data for media editing              |
| `NodeData`      | Per-tree-node assignment state           |
| `FileItem`      | Simplified file for editor tree display  |

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
QB_HOST=localhost:18000    # qBittorrent address
```

## Key Files Reference

- `lib/db/schema.ts` — Type definitions (single source of truth)
- `lib/db/connection.ts` — SQLite connection + schema init
- `lib/db/repository.ts` — CRUD operations
- `lib/db/index.ts` — Entry point (import everything from here via `@/lib/db`)
- `lib/api.ts` — Frontend API utilities
- `lib/format.ts` — Shared utilities (PAGE_SIZE, formatSize, buildTree, FlatTree)
- `lib/qb.ts` — qBittorrent client + sync logic
