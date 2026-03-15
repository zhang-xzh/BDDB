# suruga-ya 离线网页存档 — MongoDB 存储方案

## 连接信息

| 项目 | 值 |
|---|---|
| URI | `mongodb://localhost:27017` |
| 数据库 | `suruga_ya` |
| 集合 | `products_raw` |
| 压缩 | WiredTiger `block_compressor=zstd` |

---

## 数据规模

| 指标 | 值 |
|---|---|
| 总文档数 | 54,553 |
| 平均文档大小 | 67 KB |
| 逻辑数据量 | 3.745 GB |
| 磁盘占用（zstd） | 0.808 GB |
| 压缩率 | 21.6%（节省 78%） |

---

## 文档结构

### type: page（HTML 页面）

```json
{
  "_id":  "120000056",
  "type": "page",
  "html": "<html>...</html>"
}
```

| 字段 | 说明 |
|---|---|
| `_id` | 商品编号（文件名去掉 .html） |
| `type` | 固定为 `"page"` |
| `html` | 压缩后的 HTML 字符串（minify-html 处理） |

来源：`html_clean/*.html`，共 54,423 个

---

### type: asset（资源文件）

```json
{
  "_id":  "drupal/themes/surugaya/favicon.ico",
  "type": "asset",
  "mime": "image/x-icon",
  "data": BinData(0, "...")
}
```

| 字段 | 说明 |
|---|---|
| `_id` | 相对 `html_clean/` 的 POSIX 路径 |
| `type` | 固定为 `"asset"` |
| `mime` | MIME 类型（自动推断） |
| `data` | 原始文件二进制（BSON Binary） |

来源目录：

| 目录 | 文件数 | 大小 | 内容 |
|---|---|---|---|
| `html_clean/drupal/` | 91 | 2.7 MB | CSS / JS / 图片 / 字体 |
| `html_clean/pics_webp/` | 38 | 0.1 MB | 图标 / banner |
| `html_clean/database/` | 1 | ~0 MB | 图片 |
| **合计** | **130** | **2.8 MB** | |

---

## 索引

| 索引 | 字段 | 说明 |
|---|---|---|
| `_id_`（默认） | `_id` | 按商品 ID / 资源路径精确查找 |

如需按类型批量查询，可追加：
```js
db.products_raw.createIndex({ type: 1 })
```

---

## 导入脚本

```
venv\Scripts\python.exe import_to_mongo.py
```

- 使用 19 个并发进程批量导入 HTML
- 支持重复运行（duplicate key 自动跳过）
- HTML 先经 minify-html 压缩，再存入 MongoDB

---

## 压缩说明

**两层压缩：**

1. **应用层（minify-html）**：去除空白/注释，HTML 体积缩减 ~39%
2. **存储层（WiredTiger zstd）**：按 32KB block 压缩，对应用透明，整体磁盘占用再缩减至 21.6%

读写时自动解压，应用代码无需任何处理。
