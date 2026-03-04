# Rules

## Import Rules
- **NEVER use `../..`** in imports.

## Type Consistency
- Frontend/backend/DB use **same types** from `server/db/schema.ts`.
- `Torrent` extends `@ctrl/qbittorrent` types.
- Field names must be **identical** across layers.

## Process Rules
- **NEVER manipulate node process directly**.
- **NEVER auto-start dev mode**.
- Use `npm run build` to verify errors.

## Code Style
- TypeScript strict mode.
- `<script setup lang="ts">` for Vue components.
- Composition API.
- Compact code, minimal comments.
- **TDD (Test Driven Development)** approach.

## UI Rules (Ant Design Vue)
- **Ant Design components first** - use built-in components before custom CSS.
- **Minimal CSS** - prefer component props and slots over custom styles.

## Performance Rules
- **Use any complex algorithms to optimize performance**.
- **Introduce specialized libraries when needed** (e.g., lodash, fast-deep-equal, immutable).
- **No need to consider human readability** - treat code as machine-generated.
- Pre-compute and cache data structures (e.g., path maps, lookup tables).
- Use BFS/DFS instead of array filtering for tree traversal.
- Avoid $O(n^2)$ operations on large datasets.

## NestJS Backend Specifics
- **Modular Architecture**: Separate logic into Module, Controller, and Service.
- **DTO Validation**: Use `class-validator` and `class-transformer`.
- **Dependency Injection**: Always inject services via `constructor(private readonly ...)`.