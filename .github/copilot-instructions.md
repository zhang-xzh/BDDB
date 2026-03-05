# GitHub Copilot Instructions for BDDB Project

This file provides context and guidelines for GitHub Copilot when working with the BDDB codebase.

## Project Overview

BDDB is a Next.js 16 + React 19 + TypeScript torrent/disc management system for organizing qBittorrent downloads into disc/BOX volumes. It uses SQLite (better-sqlite3) as the local database and Ant Design 6 for the UI.

### Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5.9
- **UI Library**: Ant Design 6 + @ant-design/icons
- **Database**: SQLite (better-sqlite3)
- **qBittorrent Client**: @ctrl/qbittorrent
- **ID Generation**: nanoid

### Project Structure

```
C:\APP\BDDB\
├── app/                    # Next.js App Router
│   ├── api/                # API routes
│   │   ├── qb/             # qBittorrent APIs
│   │   ├── torrents/       # Torrent management APIs
│   │   └── volumes/        # Volume management APIs
│   ├── config/             # Configuration page
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout (Ant Design ConfigProvider)
│   └── page.tsx            # Home page (torrent list)
├── components/             # React components
│   └── DiscEditor/         # Disc editor components
├── lib/                    # Utility libraries
│   ├── db/                 # Database module
│   │   ├── index.ts        # SQLite connection initialization
│   │   ├── repository.ts   # Data access layer (CRUD)
│   │   └── schema.ts       # TypeScript type definitions
│   ├── api.ts              # Frontend API utilities
│   ├── api-server.ts       # Server-side API response utilities
│   └── qb.ts               # qBittorrent client wrapper
└── data/                   # Local data directory (database storage)
```

## Type System

### Single Source of Truth

- **All types are defined in `lib/db/schema.ts`**
- Frontend, backend, and database use the **same types**
- `Torrent` extends `@ctrl/qbittorrent` types
- Field names must be **identical** across all layers
- **Never create duplicate types** in other files
- Always import from `@/lib/db/schema`

### Type-Database Mapping

| TypeScript | SQLite | Conversion |
|------------|--------|------------|
| `boolean` | `INTEGER` | 0 or 1 |
| `Date` | `INTEGER` | Unix timestamp (seconds) |
| `object` | `TEXT` | `JSON.stringify()` / `JSON.parse()` |
| `array` | `TEXT` | `JSON.stringify()` / `JSON.parse()` |
| `bigint` | `INTEGER` | File size/bytes |

## Database Guidelines

### SQLite Configuration

Always initialize SQLite with these pragmas for optimal performance:

```typescript
const db = new Database('bddb.sqlite');
db.pragma('journal_mode = WAL');        // Write-ahead logging for concurrent reads/writes
db.pragma('synchronous = NORMAL');      // Faster writes, reduced disk I/O
db.pragma('cache_size = -64000');       // 64MB cache for faster index lookups
db.pragma('mmap_size = 268435456');     // 256MB memory mapping for large file reads
db.pragma('foreign_keys = ON');         // Enforce foreign key constraints
db.pragma('temp_store = MEMORY');       // Use memory for temporary storage
```

### JSON Storage

**Never bind objects directly to SQLite** - it only accepts `number`, `string`, `bigint`, `buffer`, `null`.

All nested objects and arrays from QB API must be:
- Serialized with `JSON.stringify()` before insertion
- Deserialized with `JSON.parse()` after retrieval
- Transformed in the Repository layer

### Querying JSON Fields

Use SQLite JSON1 functions instead of in-memory processing:

```typescript
// Query JSON fields with json_extract
const stmt = db.prepare(`
  SELECT * FROM torrents 
  WHERE json_extract(qb_torrent, '$.hash') = ?
`);

// Create expression indexes for frequently queried fields
CREATE INDEX idx_torrents_hash ON torrents((json_extract(qb_torrent, '$.hash')));
CREATE INDEX idx_torrents_name ON torrents((json_extract(qb_torrent, '$.name')));

// Query JSON arrays with json_each
SELECT t.* FROM torrents t, json_each(t.torrent_file_ids) as f
WHERE f.value = ?;
```

### Required Fields

All tables must include:
- `is_deleted`: `INTEGER` (0/1) - soft delete flag
- `synced_at`: `INTEGER` - Unix timestamp for last sync

### Repository Pattern

Implement transformation utilities in `lib/db/repository.ts`:

```typescript
// Example: Torrent serialization
function toDbTorrent(torrent: Partial<Torrent>): DbTorrent {
  return {
    qb_torrent: JSON.stringify(torrent.qb_torrent),
    is_deleted: torrent.is_deleted ? 1 : 0,
    synced_at: torrent.synced_at ?? Date.now(),
  };
}

function fromDbTorrent(row: any): Torrent {
  return {
    ...row,
    qb_torrent: JSON.parse(row.qb_torrent),
    is_deleted: !!row.is_deleted,
  } as Torrent;
}
```

### Performance Best Practices

#### ❌ Avoid: Individual Inserts

```typescript
// Slow: Each insert is a separate transaction
for (const t of torrents) {
  await addTorrent(t);  // 1 transaction each
}
// 1000 torrents = 1000 transactions = ~2 seconds
```

#### ✅ Use: Batch Transactions

```typescript
// Fast: Single transaction for all inserts
const transaction = db.transaction(() => {
  const stmt = db.prepare('INSERT INTO torrents (...) VALUES (...)');
  for (const t of torrents) {
    stmt.run(...);
  }
});
transaction();
// 1000 torrents = 1 transaction = ~0.1 seconds
```

#### Performance Targets

| Operation | Target Performance |
|-----------|-------------------|
| 1,000 torrents | ~0.1 seconds |
| 100,000 files | ~0.5 seconds |
| Throughput | 50-100 MB/s |

**Always use**:
- `db.transaction()` for batch operations
- `db.prepare()` to avoid repeated SQL parsing
- Single transaction batches of 5,000-10,000 records

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
// app/api/torrents/route.ts
export const runtime = 'nodejs';

export async function GET() {
  try {
    const torrents = await getTorrents();
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

- Use `'use client'` directive at the top
- Use React 19 hooks: `useState`, `useEffect`, `useCallback`, `useRef`
- Use Ant Design 6 components
- **No direct DOM manipulation**

### Example Component

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Button, Table } from 'antd';
import type { Torrent } from '@/lib/db/schema';

export default function TorrentList() {
  const [torrents, setTorrents] = useState<Torrent[]>([]);
  
  useEffect(() => {
    // Fetch torrents
  }, []);
  
  return <Table dataSource={torrents} />;
}
```

## Naming Conventions

- **Components**: PascalCase (e.g., `DiscEditor.tsx`)
- **Utilities**: camelCase (e.g., `api.ts`, `useDiscEditor.ts`)
- **API Routes**: `route.ts` in folder
- **Database Fields**: snake_case (e.g., `is_deleted`, `synced_at`)
- **TypeScript**: camelCase for variables/functions, PascalCase for types/interfaces
- **Path Alias**: `@/` refers to project root

## Development Workflow

### Build & Run

```bash
npm run dev      # Development server (http://localhost:3000)
npm run build    # Production build (always verify before commit)
npm run start    # Production server
npm run lint     # ESLint
```

### Environment Variables

Configure in `.env.local`:

```env
QB_HOST=localhost:18000    # qBittorrent address
QB_USER=                   # qBittorrent username
QB_PASS=                   # qBittorrent password
```

## Common Patterns

### Fetching Data

```typescript
// Frontend (using lib/api.ts)
import { fetchTorrents } from '@/lib/api';

const torrents = await fetchTorrents();
```

### Database Operations

```typescript
// Server-side (using lib/db/repository.ts)
import { getTorrents, addTorrent } from '@/lib/db/repository';

const torrents = getTorrents();
addTorrent(torrentData);
```

### Error Handling

```typescript
// Always handle undefined and null
// SQLite doesn't accept undefined - convert to null
const value = myValue ?? null;

// Type checking before db.run()
if (typeof param !== 'string') {
  throw new Error('Invalid parameter type');
}
```

## Code Quality Standards

- **TypeScript strict mode**: No `any` types without justification
- **Error boundaries**: Always handle potential errors
- **Type safety**: Use type assertions from `lib/db/schema.ts`
- **Performance**: Batch database operations
- **Consistency**: Follow existing patterns in the codebase

## Key Files Reference

- `lib/db/schema.ts` - Type definitions (single source of truth)
- `lib/db/repository.ts` - Database CRUD operations
- `lib/db/index.ts` - SQLite connection & initialization
- `lib/api.ts` - Frontend API utilities
- `lib/qb.ts` - qBittorrent client wrapper
- `DATABASE_CONVENTIONS.md` - Detailed database documentation
