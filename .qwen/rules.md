# BDDB Development Rules

## Type Consistency
- Frontend/backend/DB use **same types** from `lib/db/schema.ts`.
- `Torrent` extends `@ctrl/qbittorrent` types.
- Field names must be **identical** across layers.

## Type Definitions
- All types defined in `lib/db/schema.ts`.
- Do NOT create duplicate types in other files.
- Import types from `@/lib/db/schema`.

## API Conventions
- API routes use `Node.js` runtime (not Edge).
- Response format: `{ success: boolean, data?: string, error?: string }`.
- Data is JSON.stringified in response.

## Component Conventions
- Client components: `'use client'` directive.
- Ant Design 6 components.
- No direct DOM manipulation.

## Database Conventions
- NeDB collections: `torrents`, `files`, `volumes`.
- All documents have `is_deleted` and `synced_at` fields.
- Use repository pattern for data operations.

## File Naming
- Components: PascalCase (e.g., `DiscEditor.tsx`).
- Utilities: camelCase (e.g., `api.ts`).
- Routes: `route.ts` in folder.

## Build & Run
```bash
npm run build    # Always verify build before commit
npm run dev      # Development
npm run start    # Production
```
