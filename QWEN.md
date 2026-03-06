# BDDB Project Rules for Qwen Code

## Project Overview

BDDB 是一个基于 **Next.js 16 + React 19 + TypeScript** 的 Web 应用，用于管理 qBittorrent 种子文件和卷（Volume）元数据。

### Tech Stack

| 类别 | 技术 |
|------|------|
| **框架** | Next.js 16 (App Router, Standalone 模式) |
| **前端** | React 19, Ant Design 6, TypeScript 5.9 |
| **后端** | Next.js API Routes (Node.js 运行时) |
| **存储** | 内存 Map + JSON 文件 (无 SQL 数据库) |
| **外部服务** | qBittorrent API (@ctrl/qbittorrent) |
| **部署** | Docker (多阶段构建) |
| **ID 生成** | nanoid |

### Project Structure

```
C:\APP\BDDB\
├── app/                    # Next.js App Router
│   ├── api/                # API routes
│   │   ├── qb/             # qBittorrent 相关 (sync, torrents, files)
│   │   ├── store/          # Store 管理 (flush)
│   │   ├── torrents/       # 种子文件管理
│   │   └── volumes/        # 卷数据 CRUD
│   ├── config/             # 配置页面
│   ├── globals.css         # 全局样式
│   ├── layout.tsx          # 根布局 (Ant Design ConfigProvider)
│   └── page.tsx            # 首页 (种子列表)
├── components/             # React 组件
│   ├── DiscEditor.tsx      # 卷编辑器核心组件
│   ├── home/               # 首页 UI 组件 + hooks
│   └── layout/             # 布局壳组件
├── lib/                    # 工具库
│   ├── db.ts               # 数据层核心 (类型 + 存储 + CRUD)
│   ├── qb.ts               # qBittorrent 客户端 + 同步
│   └── api.ts              # 前端 API 工具
└── data/                   # 本地数据目录
    ├── torrents/           # 每个种子一个 JSON 文件 ({hash}.json)
    └── volumes.json        # 所有卷数据
```

---

## Storage Architecture

### In-Memory Store (`lib/db.ts`)

所有数据在启动时加载到内存，写入时持久化到 JSON 文件。

```typescript
// 内存 Maps
byHash: Map<string, TorrentRecord>  // hash → torrent+files
byId:   Map<string, TorrentRecord>  // id   → torrent+files
fileIndex: Map<string, string>      // fileId → torrentHash
volumesMap: Map<string, Volume>     // id → volume
```

**规则：访问 Maps 前必须 `await ensureInit()`** — 首次调用时从磁盘加载数据（懒加载，单例）。

### File Layout

```
data/torrents/{hash}.json   ← TorrentRecord (种子元数据 + files[])
data/volumes.json           ← Volume[] (所有卷)
```

### Atomic Writes

所有写入使用 `写入 .tmp → fs.rename` 防止损坏：

```typescript
await fs.writeFile(`${filePath}.tmp`, JSON.stringify(data));
await fs.rename(`${filePath}.tmp`, filePath);
// 使用 writeTorrent() / writeVolumes() from lib/db.ts
```

### TorrentRecord Structure

```typescript
interface TorrentRecord {
  id: string;
  hash: string;
  added_on: number;
  qb_torrent: QbTorrent;    // 完整 QB 元数据
  is_deleted: boolean;
  synced_at: number;
  files: StoredFile[];       // 内嵌，无单独表
}
```

---

## Type System

### Single Source of Truth

- **所有类型定义在 `lib/db.ts`**
- 前后端存储使用**相同类型**
- **禁止在其他文件中创建重复类型**
- 始终从 `@/lib/db` 导入类型

### Core Types

| 类型 | 描述 |
|------|------|
| `TorrentRecord` | 文件存储格式 (torrent + files) |
| `Torrent` | API/前端视图 |
| `StoredFile` | 内嵌在 TorrentRecord 中的文件 |
| `Volume` | 卷/盒元数据 |

### Volume Fields

```typescript
interface Volume {
  id: string;
  torrent_id: string;
  torrent_file_ids: string[];
  type?: 'volume' | 'box';
  volume_no: number;
  catalog_no: string;
  volume_name?: string;
  is_deleted: boolean;
  updated_at: number;
}
```

---

## API Conventions

### Runtime & Response Format

- **所有 API 路由使用 Node.js 运行时** (非 Edge)
- 标准响应格式：

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

---

## Component Guidelines

### Client Components

- `'use client'` 仅用于**客户端边界** (page/layout 入口或必须在浏览器运行的模块)
- **不要**给每个子组件默认添加 `'use client'`
- 使用 React 19 hooks: `useState`, `useEffect`, `useCallback`, `useRef`
- 使用 Ant Design 6 组件
- **禁止直接 DOM 操作**

### File Consolidation — Fewer Files is Better

- **不要为了拆分而拆分**。仅当代码在别处复用或足够大时才创建新文件（指导：>400 行）
- **仅被一个组件使用的 Hook** 放在同一文件中 — 不要提取到单独的 `useXxx.ts`
- **仅被一个父组件渲染的小组件** (<80 行) 放在父组件同一文件中 — 不要提取
- **内部类型定义** 如果只在一个文件中使用，保留在该文件中 — 不要创建 `types.ts`
- **纯工具函数** 如果紧密耦合于一个功能，放在同一文件中
- 仅当满足以下条件时才提取到单独文件：(a) 被多个文件共享，或 (b) 单文件超过 ~600 行
- 保持 `app/page.tsx` 和 `app/layout.tsx` 为精简的组合/编排层

### Styling — Ant Design First

- **Ant Design 组件及其内置 props 是最高优先级**
- 目标：**零自定义 CSS** 和 **零原生 `<div>`**
- 使用 Ant Design 布局原语：
    - `<Flex>` / `<Space>` 用于对齐和间距
    - `<Row>` / `<Col>` 用于网格布局
    - `<Typography.Text>`, `<Typography.Title>` 用于文本
    - `style` prop 仅作为最后手段
- 当 Ant Design 组件可以胜任时，不要写原生 `<div>`

---

## Naming Conventions

- **组件**: PascalCase (e.g., `DiscEditor.tsx`)
- **工具函数**: camelCase (e.g., `api.ts`, `useDiscEditor.ts`)
- **API 路由**: `route.ts` in folder
- **存储字段**: snake_case (e.g., `is_deleted`, `synced_at`)
- **TypeScript**: camelCase 用于变量/函数，PascalCase 用于类型/接口
- **路径别名**: `@/` 指向项目根目录

---

## Development Workflow

### Build & Run

```bash
npm run dev      # 开发服务器 (http://localhost:3000)
npm run build    # 生产构建 (始终在提交前验证)
npm run start    # 生产服务器
npm run lint     # ESLint
```

### Environment Variables

配置在 `.env.local`:

```env
QB_HOST=localhost:18000    # qBittorrent 地址
```

---

## Key Files Reference

| 文件 | 描述 |
|------|------|
| `lib/db.ts` | 类型定义 + 内存存储 + CRUD (单一事实来源) |
| `lib/qb.ts` | qBittorrent 客户端 + 同步逻辑 |
| `lib/api.ts` | 前端 API 工具 |
| `app/api/**/route.ts` | API 路由 |
| `components/DiscEditor.tsx` | 卷编辑器核心组件 |
| `components/home/TorrentList.tsx` | 种子列表 UI + hooks |

---

## Product Vision (Context)

BDDB 是一个面向日版动画光盘收藏的**本地数据管理工具**。

### 三层数据架构

| Layer | 目标 | 状态 |
|-------|------|------|
| **Layer 1** | 种子 → Volume 元数据标记 | 当前阶段 |
| **Layer 2** | Volume 内部细节 (碟片/特典/扫图 + 3D 展示) | 规划中 |
| **Layer 3** | Volume → Work 作品聚合 → 媒体库 API | 规划中 |

### 设计原则

- **手动优先**：不依赖自动识别，数据质量由人工保证
- **本地优先**：所有数据存储在本地，无需联网
- **元数据完整性**：宁可字段为空，不填错误数据
- **开放接口**：最终暴露标准 API，可接入 Jellyfin/Emby 等媒体库
