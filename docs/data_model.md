# BDDB 数据模型文档

## 数据流概览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              数据源层 (qBittorrent)                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Torrent (种子)                                                      │   │
│  │  ├── hash (唯一标识)                                                 │   │
│  │  ├── name (种子名称)                                                 │   │
│  │  ├── size, progress, state...                                       │   │
│  │  └── files[] ─────────┐                                             │   │
│  │      ├── file1.m2ts   │                                             │   │
│  │      ├── file2.m2ts   │                                             │   │
│  │      └── scan/xxx.jpg │                                             │   │
│  │                       │                                             │   │
│  └───────────────────────┼─────────────────────────────────────────────┘   │
│                          │                                                  │
└──────────────────────────┼──────────────────────────────────────────────────┘
                           │ 拆分 (DiscEditor)
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Volume 层 (卷/碟)                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Volume (一张BD/DVD碟)                                               │   │
│  │  ├── torrent_id ───────► 关联 Torrent                                │   │
│  │  ├── volume_no (1, 2, 3...)                                         │   │
│  │  ├── catalog_no (型番: BCXA-1234)                                   │   │
│  │  ├── volume_name (标题: 「作品名」第1巻)                               │   │
│  │  ├── file_ids[] ◄──────┐  引用Torrent中的部分文件                      │   │
│  │  ├── work_ids[] ────┐  │  关联Bangumi作品 (→ bddb_works)              │   │
│  │  └── product_ids[] ─┼──┼► 关联商品信息 (→ productRepository.ts)       │   │
│  │                     │  │                                            │   │
│  │  ┌──────────────────┼──┼─────────────────────────────────────────┐  │   │
│  │  │  Volume 2        │  │                                         │  │   │
│  │  │  ├── volume_no=2 │  │                                         │  │   │
│  │  │  ├── file_ids[] ─┼──┘                                         │  │   │
│  │  │  ├── work_ids[] ─┘                                             │  │   │
│  │  │  └── product_ids[]                                             │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                          │                                                  │
└──────────────────────────┼──────────────────────────────────────────────────┘
                           │ 拆分 (MediaEditor)
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Media 层 (媒介/内容)                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Media (具体媒介内容: 正片/CD/扫图)                                    │   │
│  │  ├── volume_id ────────► 关联 Volume                                 │   │
│  │  ├── media_no (1, 2, 3...)                                          │   │
│  │  ├── media_type (bd/dvd/cd/scan)                                    │   │
│  │  ├── content_title (内容标题: 第1話「xxx」)                            │   │
│  │  ├── description (说明: 本編/特典/音声特典...)                          │   │
│  │  └── file_ids[] ───────► 引用Volume中的部分文件                        │   │
│  │                                                                     │   │
│  │  ┌──────────────────────────────────────────────────────────────┐  │   │
│  │  │  Media 1 (BD本編)  │  Media 2 (CD特典)  │  Media 3 (Scan)   │  │   │
│  │  │  media_no=1        │  media_no=2        │  media_no=3       │  │   │
│  │  │  media_type=bd     │  media_type=cd     │  media_type=scan  │  │   │
│  │  └──────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    Work 层 (作品元数据)  ←── 来自 bangumi 离线数据源(bangumi/Archive)        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Work (作品条目, 存于 bddb_works, 数据源为本地 Bangumi MongoDB)          │   │
│  │  ├── id (Bangumi subject ID)                                        │   │
│  │  ├── name (日文名)                                                   │   │
│  │  ├── name_cn (中文名)                                                │   │
│  │  ├── type (1=书籍/2=动画/3=音乐/4=游戏/6=三次元)                        │   │
│  │  ├── images (封面图)                                                 │   │
│  │  ├── rating (评分)                                                   │   │
│  │  ├── summary (剧情简介)                                               │   │
│  │  ├── date (放送日期)                                                  │   │
│  │  └── ...                                                            │   │
│  │                                                                     │   │
│  │  【关系】Volume.work_ids[] ──────► 关联多个 Work                      │   │
│  │  (一个Volume可以包含多部作品，如总集篇BOX)                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    Product 层 (商品数据)  ←── 来自自建駿河屋离线商品信息        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Product (商品条目, 存于 suruga_ya.products)                           │   │
│  │  ├── product_id (商品ID)                                             │   │
│  │  ├── title (标题)                                                    │   │
│  │  ├── url (产品URL)                                                   │   │
│  │  ├── images[] (图片)                                                 │   │
│  │  ├── attributes.型番 ◄──── 用于与 Volume.catalog_no 匹配关联           │   │
│  │  ├── attributes.発売日 (发售日)                                        │   │
│  │  ├── attributes.定価 (定价)                                           │   │
│  │  └── ...                                                            │   │
│  │                                                                     │   │
│  │  【关系】Volume.product_ids[] ──────► 关联多个 Product                 │   │
│  │  (通过 catalog_no = attributes.型番 自动匹配)                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 数据流向

| 层级   | 实体          | 来源                          | 拆分/关联逻辑               |
|------|-------------|-----------------------------|-----------------------|
| L1   | **Torrent** | qBittorrent 同步              | 按文件结构拆分为 Volume       |
| L2   | **Volume**  | DiscEditor 人工拆分             | 按内容类型拆分为 Media        |
| L3   | **Media**   | MediaEditor 人工拆分            | 最终内容单元                |
| Meta | **Work**    | `bangumiRepository.ts` 本地查询 | 元数据关联到 Volume         |
| Meta | **Product** | `productRepository.ts` 本地查询 | 商品信息关联到 Volume (型番匹配) |

## MongoDB 集合

| 集合名                  | 数据库       | 说明                                        | 关键字段                                                      |
|----------------------|-----------|-------------------------------------------|-----------------------------------------------------------|
| `bddb_torrents`      | bddb      | 种子数据                                      | `hash`, `files[]`                                         |
| `bddb_volumes`       | bddb      | 卷/碟数据                                     | `torrent_id`, `file_ids[]`, `work_ids[]`, `product_ids[]` |
| `bddb_medias`        | bddb      | 媒介数据                                      | `volume_id`, `file_ids[]`                                 |
| `bddb_works`         | bddb      | 作品元数据                                     | `id` (Bangumi subject ID), `name`, `name_cn`              |
| `subjects` 等         | bangumi   | Bangumi 本地数据（由 `bangumiRepository.ts` 访问） | `_id`, `name`, `name_cn`, `date`                          |
| `suruga_ya.products` | suruga_ya | 商品数据                                      | `product_id`, `title`, `attributes.型番`                    |

## 关系说明

### 1. Torrent → Volume (1:N)

- 一个 Torrent 可拆分为多个 Volume
- Volume 通过 `torrent_id` 关联 Torrent
- Volume 的 `file_ids[]` 引用 Torrent 中的文件

### 2. Volume → Media (1:N)

- 一个 Volume 可拆分为多个 Media
- Media 通过 `volume_id` 关联 Volume
- Media 的 `file_ids[]` 引用 Volume 关联的文件

### 3. Volume → Work (N:M)

- 一个 Volume 可关联多个 Work（如总集篇 BOX）
- 一个 Work 可属于多个 Volume
- 通过 Volume 的 `work_ids[]` 数组实现
- Work 数据来源：`bangumiRepository.ts` 从本地 Bangumi MongoDB (`subjects` 集合) 查询，写入 `bddb_works`

### 4. Volume → Product (N:M)

- 一个 Volume 可关联多个 Product（同一型番可能对应多个商品记录）
- 一个 Product 可属于多个 Volume
- 通过 Volume 的 `product_ids[]` 数组实现
- 关联逻辑：`Volume.catalog_no` 匹配 `Product.attributes.型番`，由 `linkVolumesToProducts()` 自动执行
- Product 数据来源：`productRepository.ts` 从 `suruga_ya.products` 集合读取

## 页面功能对应

| 页面          | 功能                  | 编辑器         | API 端点                          |
|-------------|---------------------|-------------|---------------------------------|
| `/torrents` | 管理种子，拆分为 Volume     | DiscEditor  | `POST /api/volumes`             |
| `/media`    | 管理 Volume，拆分为 Media | MediaEditor | `POST /api/volumes/[id]/medias` |
| `/work`     | 管理 Volume 关联的 Work  | WorkEditor  | `POST /api/volumes/[id]/works`  |

## ER 图

```
┌─────────────────┐       ┌──────────────────────┐       ┌─────────────────┐
│    Torrent      │◄──────│       Volume         │◄──────│      Media      │
├─────────────────┤  1:N  ├──────────────────────┤  1:N  ├─────────────────┤
│ _id             │       │ torrent_id           │       │ volume_id       │
│ hash            │       │ catalog_no           │       │ media_type      │
│ files[]         │──────►│ file_ids[]           │──────►│ file_ids[]      │
└─────────────────┘       │ work_ids[]     ──►─┐ │       └─────────────────┘
                          │ product_ids[]  ──►─┼─┼─┐
                          └──────────────────────┘ │ │
                                  ▲               │ │
                          ┌───────┘               │ │
                          │ N:M (via work_ids)    │ │
                 ┌─────────────────┐              │ │
                 │      Work       │◄─────────────┘ │
                 ├─────────────────┤                │
                 │ _id             │                │
                 │ id (Bangumi)    │                │
                 │ name / name_cn  │                │
                 │ [bddb_works]    │                │
                 └─────────────────┘                │
                 [来自 bangumiRepository.ts]         │
                                                    │ N:M (via product_ids)
                 ┌─────────────────┐                │
                 │     Product     │◄───────────────┘
                 ├─────────────────┤
                 │ _id             │
                 │ product_id      │
                 │ title           │
                 │ attributes.型番 │◄── 匹配 catalog_no
                 │ [suruga_ya]     │
                 └─────────────────┘
                 [来自 productRepository.ts]
```
