# BDDB 后端架构设计与实现文档

## 1. 技术栈概览

| 组件     | 技术          | 版本     | 用途                      |
|--------|-------------|--------|-------------------------|
| 框架     | Next.js     | 16.1.7 | App Router + API Routes |
| 数据库    | MongoDB     | 7.x    | 文档存储                    |
| 搜索引擎   | MeiliSearch | 0.55.0 | 全文检索                    |
| 下载客户端  | qBittorrent | 4.x+   | BT 下载管理                 |
| 语言     | TypeScript  | 5.9.3  | 类型安全                    |
| UI 组件库 | Ant Design  | 6.3.1  | 前端界面                    |

---

## 2. 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js 应用层                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  页面路由    │  │  API 路由   │  │  服务端组件  │              │
│  │  (App Router)│  │  (Route Handlers)│  │  (Server Components)│    │
│  └─────────────┘  └──────┬──────┘  └─────────────┘              │
└──────────────────────────┼──────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │   lib/     │  │   lib/     │  │   lib/     │
    │  mongodb/  │  │ meilisearch│  │     qb     │
    └─────┬──────┘  └─────┬──────┘  └─────┬──────┘
          │               │               │
          ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │  MongoDB   │  │ MeiliSearch│  │ qBittorrent│
    │  3数据库    │  │  2索引      │  │   Web API  │
    └────────────┘  └────────────┘  └────────────┘
```

---

## 3. 数据库设计 (MongoDB)

### 3.1 多数据库架构

使用 3 个独立的 MongoDB 数据库：

| 数据库                  | 用途           | 环境策略   |
|----------------------|--------------|--------|
| `suruga_ya`          | 产品数据（骏河屋抓取）  | 所有环境共用 |
| `bangumi`            | Bangumi 离线数据 | 所有环境共用 |
| `bddb_dev/prod/test` | BDDB 运营数据    | 按环境隔离  |

### 3.2 集合结构

#### BDDB 运营数据库 (`bddb_dev/prod/test`)

```typescript
// bddb_torrents - 种子信息
interface BddbTorrent {
    _id: ObjectId
    hash: string                    // BT 哈希
    name: string                    // 种子名称
    size: number                    // 总大小
    progress: number               // 下载进度
    state: string                  // qBittorrent 状态
    save_path: string              // 保存路径
    category: string               // 分类
    tags: string                   // 标签
    files: BddbTorrentFile[]       // 嵌入的文件列表
    is_deleted: boolean            // 软删除标记
    synced_at: number              // 同步时间戳
    created_at: number
    updated_at: number
}

// bddb_volumes - 光盘卷信息
interface BddbVolume {
    _id: ObjectId
    torrent_id: ObjectId           // 关联种子
    volume_no: number              // 卷号
    catalog_no: string             // 型番/目录号
    volume_name: string            // 卷名称
    product_ids: ObjectId[]        // 关联产品ID
    file_ids: ObjectId[]           // 关联文件ID
    work_ids: ObjectId[]           // 关联作品ID
    is_deleted: boolean
    created_at: number
    updated_at: number
}

// bddb_medias - 媒体盘片信息
interface BddbMedia {
    _id: ObjectId
    volume_id: ObjectId            // 关联卷
    media_no: number               // 媒体编号
    media_type: 'bd' | 'dvd' | 'cd' | 'scan'  // 媒体类型
    content_title?: string         // 内容标题
    description?: string           // 描述
    file_ids: ObjectId[]           // 关联文件
    is_deleted: boolean
    created_at: number
    updated_at: number
}

// bddb_works - 作品信息（Bangumi 同步）
interface BddbWork {
    _id: ObjectId
    id: number                     // Bangumi subject_id
    url: string                    // bgm.tv 链接
    type: number                   // 条目类型
    name: string                   // 原名
    name_cn: string                // 中文名
    summary: string                // 简介
    eps: number                    // 话数
    air_date: string               // 放送日期
    air_weekday: number            // 放送星期
    images: BangumiImages          // 图片信息
    rating: BangumiRating          // 评分
    rank: number                   // 排名
    collection: BangumiCollection  // 收藏统计
    crt?: BangumiCharacter[]       // 角色
    staff?: BangumiStaff[]         // 制作人员
    created_at: number
    updated_at: number
}
```

#### Suruga Ya 数据库 (`suruga_ya`)

```typescript
// products - 产品信息
interface MongoProduct {
    _id: ObjectId
    product_id: string             // 商品ID
    title: string                  // 标题
    url: string                    // 产品URL
    images: string[]               // 图片列表
    note_raw?: string              // HTML描述
    tracklist?: TrackList[]        // 曲目列表
    attributes: {
        メーカー?: string            // 制作商
        発売日?: string              // 发售日
        定価?: string                // 定价
        型番?: string                // 型号（关联关键字段）
        声優?: string[]              // 声优
        原画?: string[]              // 原画师
        // ... 其他属性
    }
}
```

#### Bangumi 数据库 (`bangumi`)

```typescript
// subjects - 条目
interface BangumiSubjectDoc {
    _id: number                    // subject_id
    name: string
    name_cn: string
    type: number
    platform?: number
    infobox?: object               // 信息框
    summary: string                // 简介
    date: string                   // 放送/发售日期
    meta?: {
        score: number
        rank: number
        favorite: object
    }
}

// persons, characters, episodes, subject_persons, 
// subject_characters, subject_relations 等关联集合
```

---

## 4. 搜索架构 (MeiliSearch)

### 4.1 双索引设计

| 索引名                | 主键           | 用途           |
|--------------------|--------------|--------------|
| `products`         | `product_id` | 产品搜索         |
| `bangumi_subjects` | `subject_id` | Bangumi 条目搜索 |

### 4.2 配置策略

```typescript
// products 索引配置
{
    searchableAttributes: [
        'title', 'manufacturer', 'voice_actors',
        'artists', 'scenario', 'model_number', 'note_raw'
    ],
        filterableAttributes
:
    ['manufacturer', 'release_date', 'model_number'],
        sortableAttributes
:
    ['product_id', 'release_date'],
        rankingRules
:
    ['words', 'exactness', 'typo', 'proximity', 'attribute', 'sort']
}

// bangumi_subjects 索引配置
{
    searchableAttributes: ['name', 'name_cn', 'summary', 'tags'],
        filterableAttributes
:
    ['type', 'platform', 'score', 'nsfw', 'tags'],
        sortableAttributes
:
    ['subject_id', 'score', 'rank', 'date']
}
```

### 4.3 数据同步机制

| 同步方式 | 命令                      | 用途      |
|------|-------------------------|---------|
| 全量同步 | `npm run meili:sync`    | 首次/重建索引 |
| 增量同步 | API 调用                  | 实时更新    |
| 重建索引 | `npm run meili:rebuild` | 清空重建    |

---

## 5. 外部服务集成

### 5.1 qBittorrent 集成

```typescript
// lib/qb.ts
interface SyncResult {
    success: boolean
    newCount?: number      // 新增种子数
    updateCount?: number   // 更新种子数
    total?: number         // 总数
    error?: string
}

// 同步流程
async function syncTorrentsFromQb(): Promise<SyncResult> {
    1.
    获取
    qBittorrent
    种子列表
    2.
    逐个获取种子文件列表（带延迟控制）
  3.
    对比数据库，执行新增 / 更新
    4.
    按文件名匹配更新文件信息
    5.
    返回同步统计
}
```

**连接配置**：

- 环境变量：`QB_HOST` (默认: `localhost:18000`)
- 客户端库：`@ctrl/qbittorrent`

### 5.2 Bangumi API 客户端

```typescript
// lib/bangumi.ts
// 本地 API 封装，与 Bangumi 在线 API 保持兼容

async function searchBangumi(keywords: string, type: number): Promise<BangumiSearchResult>

async function getBangumiSubject(subjectId: number): Promise<BangumiSubject>
```

**数据来源**：

- 本地 MongoDB (`bangumi` 数据库)
- 非实时爬取 Bangumi 数据

---

## 6. API 路由设计

### 6.1 种子管理 (`/api/torrents`)

| 路由                         | 方法   | 功能                 |
|----------------------------|------|--------------------|
| `/api/torrents/info`       | GET  | 获取种子列表/详情（支持分页、筛选） |
| `/api/torrents/files`      | GET  | 获取种子文件列表           |
| `/api/torrents/sync`       | POST | 从 qBittorrent 同步种子 |
| `/api/torrents/sync-files` | GET  | 同步单个种子文件信息         |
| `/api/torrents/delete`     | POST | 软删除种子              |

**筛选参数**：

- `state`: 状态筛选 (paused/completed)
- `search`: 名称搜索
- `hasVolumes`: 是否有卷关联
- `page/pageSize`: 分页

### 6.2 卷管理 (`/api/volumes`)

| 路由                               | 方法              | 功能             |
|----------------------------------|-----------------|----------------|
| `/api/volumes`                   | GET             | 获取卷列表（支持分页/全量） |
| `/api/volumes`                   | POST            | 批量保存卷          |
| `/api/volumes/[id]/files`        | GET             | 获取卷关联文件        |
| `/api/volumes/[id]/medias`       | GET/POST        | 获取/保存媒体        |
| `/api/volumes/[id]/works`        | GET/POST/DELETE | 作品关联管理         |
| `/api/volumes/[id]/product-note` | GET             | 获取产品备注         |
| `/api/volumes/link-products`     | POST            | 按型番自动关联产品      |

### 6.3 作品管理 (`/api/works`)

| 路由                | 方法  | 功能       |
|-------------------|-----|----------|
| `/api/works`      | GET | 获取作品列表   |
| `/api/works/[id]` | GET | 获取单个作品详情 |

### 6.4 Bangumi 数据 (`/api/bangumi`)

| 路由                          | 方法  | 功能                |
|-----------------------------|-----|-------------------|
| `/api/bangumi/search`       | GET | 搜索条目（MeiliSearch） |
| `/api/bangumi/subject/[id]` | GET | 获取条目详情            |

**搜索参数**：

- `search`: 关键词
- `type`: 条目类型
- `minScore/maxScore`: 评分范围
- `nsfw`: NSFW 过滤

### 6.5 产品搜索 (`/api/products`)

| 路由                     | 方法  | 功能                |
|------------------------|-----|-------------------|
| `/api/products/search` | GET | 产品搜索（MeiliSearch） |

---

## 7. 核心数据流

### 7.1 种子同步流程

```
qBittorrent → GET /api/torrents/sync → lib/qb.ts → MongoDB (bddb_torrents)
                    ↓
              1. 获取种子列表
              2. 获取文件列表（串行+延迟）
              3. 对比更新/插入
              4. 软删除处理
```

### 7.2 卷-产品关联流程

```
POST /api/volumes/link-products
              ↓
    遍历所有 bddb_volumes
              ↓
    用 catalog_no 查询 suruga_ya.products.attributes.型番
              ↓
    匹配成功 → 更新 volume.product_ids
```

### 7.3 搜索索引同步流程

```
MongoDB (suruga_ya.products) → 转换 → MeiliSearch (products)
MongoDB (bangumi.subjects)   → 转换 → MeiliSearch (bangumi_subjects)
```

---

## 8. 代码组织结构

```
BDDB-Next/
├── lib/
│   ├── api.ts                    # 前端 API 工具
│   ├── bangumi.ts                # Bangumi 类型与 API
│   ├── qb.ts                     # qBittorrent 集成
│   ├── utils.ts                  # 通用工具
│   ├── qbittorrent-types.d.ts    # QB 类型扩展
│   ├── mongodb/
│   │   ├── connection.ts         # MongoDB 连接
│   │   ├── index.ts              # 统一导出
│   │   ├── bddbRepository.ts     # BDDB 数据操作
│   │   ├── productRepository.ts  # 产品数据操作
│   │   └── bangumiRepository.ts  # Bangumi 数据操作
│   └── meilisearch/
│       ├── client.ts             # MeiliSearch 客户端
│       ├── index.ts              # 统一导出
│       ├── productSearch.ts      # 产品搜索
│       ├── bangumiSearch.ts      # Bangumi 搜索
│       └── syncProducts.ts       # 同步逻辑
├── app/api/                      # API 路由
└── scripts/                      # 同步脚本
```

---

## 9. 环境变量配置

```bash
# MongoDB
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_URI=mongodb://localhost:27017

# 数据库名称（按环境）
MONGO_DB_DEV=bddb_dev
MONGO_DB_PROD=bddb_prod
MONGO_DB_TEST=bddb_test

# 固定数据库
SURUGA_YA_DB=suruga_ya
BANGUMI_DB=bangumi

# MeiliSearch
MEILI_HOST=http://localhost:17700

# qBittorrent
QB_HOST=localhost:18000

# Node 环境
NODE_ENV=development
```

---

## 10. 开发脚本

```json
{
  "meili:sync": "全量同步产品到 MeiliSearch",
  "meili:rebuild": "重建产品索引",
  "meili:stats": "查看索引统计",
  "meili:clear": "清空产品索引",
  "bangumi:sync": "全量同步 Bangumi 到 MeiliSearch",
  "bangumi:rebuild": "重建 Bangumi 索引",
  "bangumi:stats": "查看 Bangumi 索引统计",
  "bangumi:clear": "清空 Bangumi 索引"
}
```

---

## 11. 关键设计决策

### 11.1 软删除策略

所有运营数据集合 (`bddb_torrents`, `bddb_volumes`, `bddb_medias`) 都包含 `is_deleted` 字段：

- 删除操作仅标记 `is_deleted: true`
- 查询默认过滤 `is_deleted: false`
- 保留历史数据便于恢复

### 11.2 嵌入 vs 引用

| 场景                | 策略 | 原因             |
|-------------------|----|----------------|
| Torrent → Files   | 嵌入 | 文件随种子一起访问，数量可控 |
| Volume → Products | 引用 | 多对多关系，产品独立管理   |
| Volume → Works    | 引用 | Works 可被多卷共享   |

### 11.3 同步性能优化

- qBittorrent 文件获取：串行+延迟（避免并发过高）
- MeiliSearch 批量：1000 条/批次
- MongoDB 聚合：使用 `$lookup` 减少查询次数

### 11.4 类型安全

- 全项目 TypeScript 严格模式
- 数据库文档类型与接口一一对应
- API 返回统一格式 `{success, data, error}`
