# BDDB Development Rules

## Type System

### Type Consistency
- Frontend/backend/database use **same types** from `lib/db/schema.ts`
- `Torrent` extends `@ctrl/qbittorrent` types
- Field names must be **identical** across all layers
- **Never create duplicate types** in other files
- Always import types from `@/lib/db/schema`

### Type-Database Mapping

| TypeScript | SQLite | Conversion |
|------------|--------|------------|
| `boolean` | `INTEGER` | 0 or 1 |
| `Date` | `INTEGER` | Unix timestamp (seconds) |
| `object` | `TEXT` | `JSON.stringify()` / `JSON.parse()` |
| `array` | `TEXT` | `JSON.stringify()` / `JSON.parse()` |
| `bigint` | `INTEGER` | File size/bytes |

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

## Component Conventions

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

## Database Conventions

### Core Requirements

- **Database**: SQLite (better-sqlite3)
- **Tables**: `torrents`, `torrent_files`, `volumes`
- **Required Fields**: All tables must include:
  - `is_deleted`: `INTEGER` (0/1) - soft delete flag
  - `synced_at`: `INTEGER` - Unix timestamp for last sync
- **Pattern**: Use repository pattern in `lib/db/repository.ts`

### SQLite Configuration

Always initialize with these pragmas:

```typescript
const db = new Database('bddb.sqlite');
db.pragma('journal_mode = WAL');        // Write-ahead logging
db.pragma('synchronous = NORMAL');      // Faster writes
db.pragma('cache_size = -64000');       // 64MB cache
db.pragma('mmap_size = 268435456');     // 256MB memory mapping
db.pragma('foreign_keys = ON');         // Foreign key constraints
db.pragma('temp_store = MEMORY');       // Use memory for temporary storage
```

### JSON Storage & Querying

**Core Rule**: SQLite only accepts `number`, `string`, `bigint`, `buffer`, `null`.

**Object/Array Handling**:
- Never bind objects directly to SQLite
- Serialize with `JSON.stringify()` before insertion
- Deserialize with `JSON.parse()` after retrieval
- Transform in Repository layer

**JSON Queries**:

```typescript
// Use json_extract for JSON field queries
const stmt = db.prepare(`
  SELECT * FROM torrents 
  WHERE json_extract(qb_torrent, '$.hash') = ?
`);

// Create expression indexes for frequently queried fields
CREATE INDEX idx_torrents_hash ON torrents((json_extract(qb_torrent, '$.hash')));
```

**JSON Array Queries**:

```typescript
// Query JSON arrays with json_each
SELECT t.* FROM torrents t, json_each(t.torrent_file_ids) as f
WHERE f.value = ?;
```

### Performance Best Practices

**Batch Operations**:

```typescript
// ❌ Avoid: Individual inserts
for (const t of torrents) {
  await addTorrent(t);  // 1 transaction each
}

// ✅ Use: Batch transaction
const transaction = db.transaction(() => {
  const stmt = db.prepare('INSERT INTO torrents (...) VALUES (...)');
  for (const t of torrents) {
    stmt.run(...);
  }
});
transaction();
```

**Performance Targets**:
- 1,000 torrents: ~0.1 seconds
- 100,000 files: ~0.5 seconds
- Throughput: 50-100 MB/s

**Key Practices**:
- Use `db.transaction()` for batch operations
- Use `db.prepare()` to avoid repeated SQL parsing
- Single transaction batches of 5,000-10,000 records

### Repository Pattern

Define transformation utilities in `lib/db/repository.ts`:

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

## File Naming Conventions

- **Components**: PascalCase (e.g., `DiscEditor.tsx`)
- **Utilities**: camelCase (e.g., `api.ts`, `useDiscEditor.ts`)
- **API Routes**: `route.ts` in folder
- **Database Fields**: snake_case (e.g., `is_deleted`, `synced_at`)
- **TypeScript**: camelCase for variables/functions, PascalCase for types/interfaces
- **Path Alias**: `@/` refers to project root

## Build & Run

```bash
npm run dev      # Development server (http://localhost:3000)
npm run build    # Production build (always verify before commit)
npm run start    # Production server
npm run lint     # ESLint
```

## Error Handling

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

## Key Reference Files

- `lib/db/schema.ts` - Type definitions (single source of truth)
- `lib/db/repository.ts` - Database CRUD operations
- `lib/db/index.ts` - SQLite connection & initialization
- `lib/api.ts` - Frontend API utilities
- `lib/qb.ts` - qBittorrent client wrapper
- `DATABASE_CONVENTIONS.md` - Detailed database documentation
- `.github/copilot-instructions.md` - GitHub Copilot instructions
