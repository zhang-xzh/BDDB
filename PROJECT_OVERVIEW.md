# BDDB - Project Overview

## Project Description

BDDB is a **Next.js 16** + **React 19** + **TypeScript** torrent/disc management system for organizing qBittorrent downloads into disc/BOX volumes. The project uses **SQLite (better-sqlite3)** as a local database with **Ant Design 6** for the UI.

### Core Technology Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.9 |
| UI Library | Ant Design 6 + @ant-design/icons |
| Database | SQLite (better-sqlite3) |
| qBittorrent Client | @ctrl/qbittorrent |
| ID Generation | nanoid |

### Project Structure

```
C:\APP\BDDB\
├── app/                    # Next.js App Router
│   ├── api/                # API routes
│   │   ├── qb/             # qBittorrent related APIs
│   │   ├── torrents/       # Torrent management APIs
│   │   └── volumes/        # Volume management APIs
│   ├── config/             # Configuration page
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout (Ant Design ConfigProvider)
│   └── page.tsx            # Home page (torrent list)
├── components/             # React components
│   ├── DiscEditor/         # Disc editor components
│   └── DiscEditor.tsx      # Main disc editor component
├── data/                   # Local data directory (database storage)
├── lib/                    # Utility libraries
│   ├── db/                 # Database module
│   │   ├── index.ts        # SQLite connection initialization
│   │   ├── repository.ts   # Data access layer (CRUD operations)
│   │   └── schema.ts       # TypeScript type definitions
│   ├── api.ts              # Frontend API utilities
│   ├── api-server.ts       # Server-side API response utilities
│   └── qb.ts               # qBittorrent client wrapper
├── next.config.ts          # Next.js configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies configuration
```

## Build & Run Commands

### Development Environment

```bash
npm run dev          # Start development server (http://localhost:3000)
```

### Production Environment

```bash
npm run build        # Build production version
npm run start        # Start production server
```

### Code Quality

```bash
npm run lint         # Run ESLint
```

### Environment Variables

Configure in `.env.local`:

```env
QB_HOST=localhost:18000    # qBittorrent address
QB_USER=                   # qBittorrent username
QB_PASS=                   # qBittorrent password
```

## Database Schema

### Type Mapping

| TypeScript | SQLite | Description |
|------------|--------|-------------|
| `boolean` | `INTEGER` | 0 or 1 |
| `Date` | `INTEGER` | Unix Timestamp (seconds) |
| `object` | `TEXT` | JSON.stringify() |
| `array` | `TEXT` | JSON.stringify() |
| `bigint` | `INTEGER` | File size/bytes |

### Core Tables

1. **torrents** - Torrent metadata
   - `qb_torrent` (TEXT/JSON): qBittorrent torrent information
   - `is_deleted` (INTEGER): Soft delete flag
   - `synced_at` (INTEGER): Sync timestamp

2. **torrent_files** - Torrent files
   - `torrent_id` (TEXT): Associated torrent ID
   - `qb_torrent_file` (TEXT/JSON): File information
   - `is_deleted` (INTEGER): Soft delete flag

3. **volumes** - Disc/BOX volumes
   - `torrent_id` (TEXT): Associated torrent ID
   - `torrent_file_ids` (TEXT/JSON): File ID array
   - `type` (TEXT): 'volume' or 'box'
   - `volume_no` (INTEGER): Volume number
   - `catalog_no` (TEXT): Catalog number

### SQLite Optimization Configuration

```typescript
db.pragma('journal_mode = WAL')           // Write-ahead logging
db.pragma('synchronous = NORMAL')         // Faster writes
db.pragma('cache_size = -64000')          // 64MB cache
db.pragma('mmap_size = 268435456')        // 256MB memory mapping
db.pragma('foreign_keys = ON')            // Foreign key constraints
db.pragma('temp_store = MEMORY')          // Use memory for temporary storage
```

## Development Guidelines

### Code Style

- Use **TypeScript** strict mode
- Components use **React Hooks** (useState, useEffect, useCallback, useRef)
- Frontend components marked as `'use client'`
- API routes use `nodejs` runtime

### Database Operations

1. **Serialization**: All objects/arrays must be converted via `JSON.stringify()` before storage
2. **Transactions**: Batch operations use `db.transaction()` to ensure atomicity
3. **Prepared Statements**: Use `db.prepare()` to avoid repeated SQL parsing
4. **JSON Queries**: Use `json_extract()` for field queries and indexing

### Naming Conventions

- Interfaces use PascalCase (e.g., `Torrent`, `Volume`)
- Functions use camelCase (e.g., `fetchTorrents`, `syncTorrents`)
- Database fields use snake_case (e.g., `is_deleted`, `synced_at`)
- File path alias: `@/` points to project root

### API Response Format

```typescript
interface FetchResponse<T> {
  success: boolean
  data?: T
  error?: string
}
```

## Main Features

1. **Torrent Sync**: Sync torrent lists and file information from qBittorrent
2. **Torrent Management**: View, search, delete torrents
3. **Disc Editor**: Organize torrent files into disc/BOX volumes
4. **Status Tracking**: Download progress, seeding status, category filtering

## Key Reference Files

- `DATABASE_CONVENTIONS.md` - Detailed database documentation
- `.github/copilot-instructions.md` - GitHub Copilot instructions
- `lib/db/schema.ts` - Complete TypeScript type definitions
- `lib/db/repository.ts` - Database CRUD operations implementation
- `lib/qb.ts` - qBittorrent client sync logic
