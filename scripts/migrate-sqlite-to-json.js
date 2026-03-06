#!/usr/bin/env node
/**
 * 数据迁移脚本：SQLite → JSON 文件
 *
 * 用法：node migrate-sqlite-to-json.js [sqlite路径] [数据目录]
 *
 * 默认：
 *   sqlite路径  = ./data/bddb.sqlite
 *   数据目录    = ./data
 */

const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')

const sqlitePath = process.argv[2] || path.join(process.cwd(), 'data', 'bddb.sqlite')
const dataDir   = process.argv[3] || path.join(process.cwd(), 'data')
const torrentsDir = path.join(dataDir, 'torrents')
const volumesFile = path.join(dataDir, 'volumes.json')

// ─── 检查源文件 ───────────────────────────────────────────────
if (!fs.existsSync(sqlitePath)) {
  console.error(`❌  找不到 SQLite 文件：${sqlitePath}`)
  process.exit(1)
}

fs.mkdirSync(torrentsDir, { recursive: true })

const db = new Database(sqlitePath, { readonly: true })
db.pragma('journal_mode = WAL')

// ─── 读取 SQLite ──────────────────────────────────────────────
console.log('📖  读取 SQLite...')

const torrentRows = db.prepare(`
  SELECT id, hash, added_on, qb_torrent, is_deleted, synced_at
  FROM torrents
`).all()

const fileRows = db.prepare(`
  SELECT id, torrent_id, qb_torrent_file, is_deleted, synced_at
  FROM torrent_files
`).all()

const volumeRows = db.prepare(`
  SELECT id, torrent_id, torrent_file_ids, type, volume_no,
         volume_name, catalog_no, is_deleted, updated_at
  FROM volumes
`).all()

console.log(`   torrents    : ${torrentRows.length}`)
console.log(`   torrent_files: ${fileRows.length}`)
console.log(`   volumes     : ${volumeRows.length}`)

// ─── 建立 fileRows 按 torrent_id 分组 ────────────────────────
const filesByTorrentId = new Map()
for (const f of fileRows) {
  if (!filesByTorrentId.has(f.torrent_id)) {
    filesByTorrentId.set(f.torrent_id, [])
  }
  filesByTorrentId.get(f.torrent_id).push(f)
}

// ─── 写入 torrents/{hash}.json ────────────────────────────────
console.log('\n💾  写入 torrent 文件...')
let torrentCount = 0

for (const row of torrentRows) {
  if (!row.hash) {
    console.warn(`   ⚠️  跳过无 hash 的 torrent id=${row.id}`)
    continue
  }

  const files = (filesByTorrentId.get(row.id) || []).map(f => ({
    id: f.id,
    qb_torrent_file: JSON.parse(f.qb_torrent_file),
    is_deleted: !!f.is_deleted,
    synced_at: f.synced_at ?? 0,
  }))

  const record = {
    id: row.id,
    hash: row.hash,
    added_on: row.added_on ?? 0,
    qb_torrent: JSON.parse(row.qb_torrent),
    is_deleted: !!row.is_deleted,
    synced_at: row.synced_at ?? 0,
    files,
  }

  const filePath = path.join(torrentsDir, `${row.hash}.json`)
  const tmpPath  = `${filePath}.tmp`
  fs.writeFileSync(tmpPath, JSON.stringify(record))
  fs.renameSync(tmpPath, filePath)
  torrentCount++
}

console.log(`   ✅  ${torrentCount} 个文件写入 ${torrentsDir}`)

// ─── 写入 volumes.json ────────────────────────────────────────
console.log('\n💾  写入 volumes.json...')

const volumes = volumeRows.map(row => ({
  id: row.id,
  torrent_id: row.torrent_id,
  torrent_file_ids: JSON.parse(row.torrent_file_ids || '[]'),
  type: row.type || undefined,
  volume_no: row.volume_no ?? 0,
  catalog_no: row.catalog_no || '',
  volume_name: row.volume_name || undefined,
  is_deleted: !!row.is_deleted,
  updated_at: row.updated_at ?? 0,
}))

const tmpVolumes = `${volumesFile}.tmp`
fs.writeFileSync(tmpVolumes, JSON.stringify(volumes))
fs.renameSync(tmpVolumes, volumesFile)

console.log(`   ✅  ${volumes.length} 条 volume 写入 ${volumesFile}`)

// ─── 完成 ─────────────────────────────────────────────────────
db.close()
console.log('\n🎉  迁移完成！')
console.log('   可以删除 bddb.sqlite（建议先备份）')
