# BDDB Development Rules

## Type System

### Type Consistency

- Frontend/backend/storage use **same types** from `lib/db/schema.ts`
- Field names must be **identical** across all layers
- **Never create duplicate types** in other files
- Always import types from `@/lib/db/schema`

## Storage Conventions

### Architecture

- **Storage**: In-memory Maps + JSON files (no SQL database)
- **Entry point**: `lib/db/store.ts` — `ensureInit()` loads data on first call
- **Pattern**: Repository pattern in `lib/db/repository.ts`
- **Required fields**: All records must include `is_deleted: boolean` and `synced_at: number`

### File Layout

```
data/torrents/{hash}.json   ← TorrentRecord (metadata + files[])
data/volumes.json           ← Volume[]
```

### Atomic Writes

Always write via `.tmp` + rename to prevent corruption:

```typescript
await fs.writeFile(`${path}.tmp`, JSON.stringify(data));
await fs.rename(`${path}.tmp`, path);
// use writeTorrent() / writeVolumes() from lib/db/store.ts
```

### Accessing the Store

```typescript
import { ensureInit, byHash, volumesMap } from '@/lib/db/store';

// Always await ensureInit() before accessing Maps
await ensureInit();
const record = byHash.get(hash);
```

### Repository Pattern

Use functions from `lib/db/repository.ts` — never access store Maps directly from API routes:

```typescript
import { getAllTorrents, saveVolume } from '@/lib/db/repository';

const torrents = await getAllTorrents();
await saveVolume(torrentId, fileIds, data);
```

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

## Code Quality Standards

- **TypeScript strict mode**: Minimize `any` types
- **Error boundaries**: Always handle potential errors
- **Type safety**: Use type assertions from `lib/db/schema.ts`
- **Consistency**: Follow existing patterns in the codebase

## Key Reference Files

- `lib/db/schema.ts` — Type definitions (single source of truth)
- `lib/db/store.ts` — In-memory Maps + file I/O primitives
- `lib/db/repository.ts` — CRUD operations
- `lib/db/index.ts` — Entry point
- `lib/api.ts` — Frontend API utilities
- `lib/qb.ts` — qBittorrent client + sync logic
