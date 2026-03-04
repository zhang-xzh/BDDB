# Rules

## Import Rules
- **NEVER use `../..`** in imports
- Use `#server/` alias for server code
- Use `~` or `#app` for app code

## Type Consistency
- Frontend/backend/DB use **same types** from `server/db/schema.ts`
- `Torrent` extends `@ctrl/qbittorrent` types
- Field names must be **identical** across layers

## Process Rules
- **NEVER manipulate node process directly**
- **NEVER auto-start dev mode**
- Use `npm run build` to verify errors

## Code Style
- TypeScript strict mode
- `<script setup lang="ts">`
- Composition API
- Compact code, minimal comments
- TDD

## UI Rules
- **Ant Design Vue components first** - use built-in components before custom CSS
- **Minimal CSS** - prefer component props and slots over custom styles
- Use `a-space`, `a-card`, `a-form` for layouts
- Use `a-typography-text` with `ellipsis` for text truncation
