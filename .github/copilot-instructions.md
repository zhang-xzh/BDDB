# GitHub Copilot Instructions for BDDB Project

This file provides context and guidelines for GitHub Copilot when working with the BDDB codebase.

## Project Overview

BDDB is a Next.js 16 + React 19 + TypeScript torrent/disc management system for organizing qBittorrent downloads into disc/BOX volumes. It uses an **in-memory store with JSON file persistence** and Ant Design 6 for the UI.

### Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5.9
- **UI Library**: Ant Design 6 + @ant-design/icons
- **Storage**: In-memory Map + JSON files (no database dependency)
- **qBittorrent Client**: @ctrl/qbittorrent
- **ID Generation**: nanoid

### Project Structure

```
C:\APP\BDDB\
├── app/                    # Next.js App Router
│   ├── api/                # API routes
│   │   ├── qb/             # qBittorrent APIs
│   │   ├── store/          # Store management APIs (flush)
│   │   ├── torrents/       # Torrent management APIs
│   │   └── volumes/        # Volume management APIs
│   ├── config/             # Configuration page
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout (Ant Design ConfigProvider)
│   └── page.tsx            # Home page (torrent list)
├── components/             # React components
│   ├── DiscEditor/         # Disc editor components
│   ├── home/               # Home page UI components + hooks
│   └── layout/             # Layout shell components
├── lib/                    # Utility libraries
│   ├── db/                 # Storage module
│   │   ├── index.ts        # Entry point (re-exports)
│   │   ├── store.ts        # In-memory Maps + file I/O
│   │   ├── repository.ts   # Data access layer (CRUD)
│   │   └── schema.ts       # TypeScript type definitions
│   ├── api.ts              # Frontend API utilities
│   ├── api-server.ts       # Server-side API response utilities
│   └── qb.ts               # qBittorrent client wrapper
└── data/                   # Local data directory
    ├── torrents/           # One JSON file per torrent ({hash}.json)
    └── volumes.json        # All volumes in one file
```

## Storage Architecture

### In-Memory Store (`lib/db/store.ts`)

All data is loaded into memory at startup and persisted to JSON files on write.

```typescript
// In-memory Maps
byHash: Map<string, TorrentRecord>  // hash → torrent+files
byId:   Map<string, TorrentRecord>  // id → torrent+files
fileIndex: Map<string, string>      // fileId → torrentHash
volumesMap: Map<string, Volume>     // id → volume
```

**Always call `ensureInit()` before accessing Maps** — it loads data from disk on first call (lazy, singleton).

### File Layout

```
data/torrents/{hash}.json   ← TorrentRecord (torrent metadata + files[])
data/volumes.json           ← Volume[] (all volumes)
```

### Atomic Writes

All writes use `write to .tmp → fs.rename` to prevent corruption:

```typescript
await fs.writeFile(`${filePath}.tmp`, JSON.stringify(data));
await fs.rename(`${filePath}.tmp`, filePath);
```

### TorrentRecord Structure

Each `{hash}.json` contains:

```typescript
interface TorrentRecord {
  id: string;
  hash: string;
  added_on: number;
  qb_torrent: QbTorrent;    // full QB metadata
  is_deleted: boolean;
  synced_at: number;
  files: StoredFile[];       // embedded, no separate table
}
```

## Type System

### Single Source of Truth

- **All types are defined in `lib/db/schema.ts`**
- Frontend, backend, and storage use the **same types**
- **Never create duplicate types** in other files
- Always import from `@/lib/db/schema`

### Core Types

| Type | Description |
|------|-------------|
| `TorrentRecord` | File storage format (torrent + files) |
| `Torrent` | API/frontend view of a torrent |
| `StoredFile` | File embedded in TorrentRecord |
| `TorrentFile` | API/frontend view of a file |
| `Volume` | Disc/BOX metadata |

### Volume Fields (only used fields retained)

```typescript
interface Volume {
  id: string;
  torrent_id: string;
  torrent_file_ids: string[];
  type?: 'volume' | 'box';
  volume_no: number;
  catalog_no: string;
  volume_name?: string;
  media_type?: 'DVD' | 'BD';
  is_deleted: boolean;
  updated_at: number;
}
```

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
- Do **not** add `'use client'` to every child component by default if it is only imported inside an existing client boundary
- Use React 19 hooks: `useState`, `useEffect`, `useCallback`, `useRef`
- Use Ant Design 6 components
- **No direct DOM manipulation**

### File Consolidation — Fewer Files is Better

- **Do not split files just for the sake of separation.** Only create a new file when the code is genuinely reused elsewhere or is large enough to justify it (guideline: >400 lines after consolidation).
- Hooks that are **only used by one component** belong in the same file as that component — do not extract them to a separate `useXxx.ts` unless they are shared.
- Small helper components (< ~80 lines) that are **only rendered by one parent** belong in the same file as the parent — do not extract them.
- Internal `interface`/`type` definitions that are only used within one file stay in that file — do not create a separate `types.ts`.
- Pure utility functions (e.g. tree building, formatting) that are tightly coupled to one feature belong in the same file unless they are reused.
- Only extract to a separate file when: (a) the code is shared by multiple files, or (b) the single file would exceed ~600 lines.
- Keep `app/page.tsx` and `app/layout.tsx` as thin composition/orchestration layers.

### Styling — Ant Design First

- **Ant Design components and their built-in props are the highest priority** for layout and styling
- Target **zero custom CSS** and **zero raw `<div>`** — use Ant Design layout primitives instead:
  - `<Flex>` / `<Space>` for alignment and gaps
  - `<Row>` / `<Col>` for grid layout
  - `<Typography.Text>`, `<Typography.Title>` for text
  - `style` prop only as last resort for values Ant Design doesn't expose
- Never write a `<div>` when an Ant Design component (`Card`, `Flex`, `Space`, `Layout`, etc.) can serve the same purpose

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
- `lib/db/store.ts` — In-memory Maps + file I/O primitives
- `lib/db/repository.ts` — CRUD operations
- `lib/db/index.ts` — Entry point
- `lib/api.ts` — Frontend API utilities
- `lib/qb.ts` — qBittorrent client + sync logic
