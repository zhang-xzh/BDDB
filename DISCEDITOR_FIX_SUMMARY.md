# DiscEditor 数据显示问题修复总结

## 问题诊断

### 根本原因
1. **数据库 ID 缺失**：`torrents` 表中所有 2112 条记录的 `id` 字段都是 `NULL`
2. **外键约束失败**：`torrent_files` 表的 `torrent_id` 字段有 `NOT NULL` 约束，无法插入数据
3. **数据类型不匹配**：API 返回 `TorrentFile[]` 但前端期望 `FileItem[]` 格式
4. **文件数据为空**：由于无法插入文件，`torrent_files` 表完全为空

## 修复内容

### 1. 数据库层修复 (lib/db/repository.ts)

#### 1.1 添加数据转换函数
```typescript
function torrentFileToFileItem(torrentFile: TorrentFile): any {
  const qbFile = torrentFile.qb_torrent_file
  return {
    id: torrentFile.id,
    name: qbFile.name,
    size: qbFile.size,
    progress: qbFile.progress || 0,
  }
}
```

#### 1.2 添加新的查询函数
```typescript
export async function getTorrentFilesAsFileItems(torrentId: string): Promise<any[]> {
  const files = await getTorrentFiles(torrentId)
  return files.map(torrentFileToFileItem)
}
```

#### 1.3 修复 addTorrent 函数
确保所有种子（无论新增或更新）都有 ID：
```typescript
if (existing) {
  // 如果已存在但没有 ID，需要设置 ID
  if (!existing.id) {
    db.prepare(`
      UPDATE torrents SET id = ?, qb_torrent = ?, is_deleted = ?, synced_at = ?
      WHERE json_extract(qb_torrent, '$.hash') = ?
    `).run(generateId(), doc.qb_torrent, doc.is_deleted, doc.synced_at, hash)
  } else {
    // 正常更新
  }
}
```

### 2. API 层修复

#### 2.1 更新 /api/torrents/files/route.ts
```typescript
import { getTorrent, getTorrentFilesAsFileItems } from '@/lib/db/repository'
// ...
const files = await getTorrentFilesAsFileItems(torrent.id!)
```

#### 2.2 更新 /api/qb/torrents/files/route.ts
```typescript
import { getTorrent, saveTorrentFiles, getTorrentFilesAsFileItems } from '@/lib/db/repository'
// ...
const dbFiles = await getTorrentFilesAsFileItems(torrent.id!)
```

### 3. 前端组件修复

#### 3.1 优化 useDiscEditor.ts 文件加载逻辑
```typescript
// 先尝试从数据库获取文件
let filesResult = await fetchApi<string>(`/api/torrents/files?hash=${torrentHash}`)
let loadedFiles: FileItem[] = []

if (filesResult?.success && filesResult.data) {
  loadedFiles = JSON.parse(filesResult.data)
}

// 如果数据库中没有文件，或者用户明确要求同步，则从 qBittorrent 同步
if (loadedFiles.length === 0 || syncFiles) {
  filesResult = await fetchApi<string>(`/api/qb/torrents/files?hash=${torrentHash}`)
  if (filesResult?.success && filesResult.data) {
    loadedFiles = JSON.parse(filesResult.data)
  }
}
```

#### 3.2 修复 FileTree.tsx 渲染依赖
```typescript
// 从依赖 nodeData 改为依赖 treeData
const titleRender = useMemo(() => {
  // ...
}, [treeData, getNodeVolume, onVolumeChange, maxVolumes])
```

### 4. 数据库修复脚本

#### 创建并执行 fix-torrent-ids.js
成功为所有 2112 条种子记录生成并设置了唯一 ID。

## 测试验证

### API 测试结果
✅ `/api/qb/torrents/info` - 成功获取 2112 个种子
✅ `/api/qb/torrents/files` - 成功同步文件并返回 FileItem 格式
✅ `/api/torrents/files` - 成功从数据库获取 FileItem 格式数据
✅ 数据结构验证 - 所有必需字段 (id, name, size, progress) 完整

### 构建测试
✅ TypeScript 编译成功，无错误
✅ Next.js 构建成功

## 影响范围

### 修改的文件
1. ✅ `lib/db/repository.ts` - 数据转换和 ID 修复
2. ✅ `app/api/torrents/files/route.ts` - 使用新转换函数
3. ✅ `app/api/qb/torrents/files/route.ts` - 使用新转换函数
4. ✅ `components/DiscEditor/useDiscEditor.ts` - 智能文件加载
5. ✅ `components/DiscEditor/FileTree.tsx` - 修复渲染依赖

### 创建的辅助文件
- `fix-torrent-ids.js` - 数据库 ID 修复脚本
- `test-disc-editor.js` - 测试脚本
- `test-disc-editor-flow.ps1` - PowerShell 测试脚本

## 预期效果

现在用户点击种子名称打开 DiscEditor 时：

1. ✅ 系统会检查数据库中是否有文件数据
2. ✅ 如果没有，自动从 qBittorrent 同步文件
3. ✅ 文件以正确的 FileItem 格式返回
4. ✅ 文件树正常显示，包含所有目录和文件
5. ✅ 可以为目录/文件分配卷号
6. ✅ 所有数据正确保存到数据库

## 注意事项

1. **已修复的数据**：所有现有 2112 个种子已生成 ID
2. **未来数据**：新同步的种子会自动生成 ID
3. **向后兼容**：修复代码同时处理有 ID 和无 ID 的情况
4. **调试日志**：添加了详细的控制台日志，方便追踪数据流

## 建议

1. 刷新浏览器页面以加载最新代码
2. 点击任意种子测试 DiscEditor 是否正常显示
3. 检查浏览器控制台的调试日志
4. 如有问题，查看日志中的文件数量和数据结构

---
修复日期: 2026-03-05
修复人员: GitHub Copilot

