# BDDB - 蓝光数据库管理系统

BDDB 是一个基于 Next.js 开发的蓝光媒体数据管理系统，用于管理 qBittorrent 种子、卷册（Volume）和媒体文件，并提供产品搜索功能。

## 功能特性

### 核心功能
- **种子管理** - 与 qBittorrent 集成，同步和管理种子数据
- **卷册管理** - 管理种子关联的卷册信息
- **媒体管理** - 管理卷册中的媒体文件（BD/DVD 等）
- **产品搜索** - 基于 MeiliSearch 的产品搜索引擎
- **数据同步** - 支持手动和自动数据同步

### 页面模块
| 页面 | 功能描述 | 状态 |
|------|----------|------|
| `/torrents` | 种子列表管理，支持搜索、筛选、分页 | ✅ 已完成 |
| `/volume` | 卷册管理，关联种子和媒体 | ✅ 已完成 |
| `/work` | 作品管理 | 🚧 开发中 |
| `/series` | 系列管理 | 🚧 开发中 |
| `/storage` | 数据管理 | 🚧 开发中 |
| `/config` | 系统配置和数据操作 | ✅ 已完成 |

## 技术栈

- **框架**: [Next.js](https://nextjs.org/) 16.x (App Router)
- **语言**: [TypeScript](https://www.typescriptlang.org/)
- **UI 组件**: [Ant Design](https://ant.design/) 6.x
- **数据库**: [MongoDB](https://www.mongodb.com/)
- **搜索引擎**: [MeiliSearch](https://www.meilisearch.com/)
- **种子客户端**: [qBittorrent](https://www.qbittorrent.org/)

## 项目结构

```
BDDB/
├── app/                      # Next.js App Router
│   ├── api/                  # API 路由
│   │   ├── products/search/  # 产品搜索 API
│   │   ├── qb/torrents/      # qBittorrent 相关 API
│   │   ├── volumes/          # 卷册管理 API
│   │   └── ...
│   ├── config/               # 配置页面
│   ├── series/               # 系列管理页面
│   ├── storage/              # 数据管理页面
│   ├── torrents/             # 种子管理页面
│   ├── volume/               # 卷册管理页面
│   ├── work/                 # 作品管理页面
│   ├── layout.tsx            # 根布局
│   └── page.tsx              # 首页（重定向到种子页）
├── components/               # React 组件
│   ├── DiscEditor.tsx        # 种子编辑器
│   ├── MediaEditor.tsx       # 媒体编辑器
│   ├── SiderContent.tsx      # 侧边栏内容
│   └── ...
├── lib/                      # 工具库和数据层
│   ├── mongodb/              # MongoDB 相关
│   │   ├── bddbRepository.ts # 数据仓库（CRUD）
│   │   ├── connection.ts     # 连接管理
│   │   └── ...
│   ├── meilisearch/          # MeiliSearch 相关
│   │   ├── client.ts         # 客户端配置
│   │   ├── productSearch.ts  # 搜索功能
│   │   └── syncProducts.ts   # 数据同步
│   ├── qb.ts                 # qBittorrent 集成
│   └── api.ts                # API 工具
├── scripts/                  # 脚本工具
│   └── syncMeilisearch.ts    # MeiliSearch 同步脚本
├── Dockerfile                # Docker 构建配置
└── next.config.ts            # Next.js 配置
```

## 快速开始

### 环境要求
- Node.js 22+
- MongoDB
- MeiliSearch
- qBittorrent（可选，用于种子同步）

### 安装依赖

```bash
npm install
```

### 环境变量

创建 `.env.local` 文件：

```env
# MongoDB
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DB_DEV=bddb_dev
MONGO_DB_TEST=bddb_test
MONGO_DB_PROD=bddb_prod

# MeiliSearch
MEILI_HOST=http://localhost:7700
MEILI_API_KEY=your_api_key

# qBittorrent
QB_HOST=http://localhost:8080
QB_USERNAME=admin
QB_PASSWORD=admin
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:3000

### 生产构建

```bash
npm run build
npm start
```

## Docker 部署

### 构建镜像

```bash
docker build -t bddb-next .
```

### 运行容器

```bash
docker run -p 3000:3000 \
  -e MONGO_HOST=mongodb \
  -e MONGO_PORT=27017 \
  -e MONGO_DB_PROD=bddb_prod \
  bddb-next
```

## 脚本命令

| 命令 | 描述 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run start` | 启动生产服务器 |
| `npm run lint` | 运行 ESLint |
| `npm run meili:sync` | 全量同步 MeiliSearch 数据 |
| `npm run meili:rebuild` | 重建 MeiliSearch 索引 |
| `npm run meili:stats` | 查看 MeiliSearch 统计 |
| `npm run meili:clear` | 清空 MeiliSearch 索引 |

## API 接口

### 种子管理
- `GET /api/qb/torrents/info?hash=&state=&search=` - 获取种子列表
- `POST /api/qb/torrents/sync` - 同步 qBittorrent 种子
- `POST /api/qb/torrents/rebuild` - 重建种子数据
- `DELETE /api/qb/torrents/delete` - 删除种子

### 卷册管理
- `GET /api/volumes?torrent_id=` - 获取卷册列表
- `POST /api/volumes` - 保存卷册信息
- `GET /api/volumes/[id]/files` - 获取卷册文件
- `GET /api/volumes/[id]/medias` - 获取卷册媒体

### 产品搜索
- `GET /api/products/search?search=&page=&limit=` - 搜索产品

## 数据模型

### Torrent（种子）
```typescript
{
  hash: string;           // 种子哈希
  name: string;           // 种子名称
  size: number;           // 文件大小
  state: string;          // 状态
  category: string;       // 分类
  tags: string[];         // 标签
  files: TorrentFile[];   // 文件列表
  isDeleted: boolean;     // 软删除标记
}
```

### Volume（卷册）
```typescript
{
  _id: string;
  torrent_id: string;     // 关联种子ID
  volume_number: number;  // 卷号
  title: string;          // 标题
  type: 'bd' | 'dvd';     // 类型
}
```

### Media（媒体）
```typescript
{
  _id: string;
  volume_id: string;      // 关联卷册ID
  file_path: string;      // 文件路径
  duration: number;       // 时长
  format: string;         // 格式
}
```

## 许可证

MIT
