// 数据库迁移脚本：为 medias 表添加 content_title 和 description 列
// 运行：node scripts/migrate-medias.js

const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const DATA_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'bddb.sqlite')

fs.mkdirSync(DATA_DIR, {recursive: true})

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

console.log('Running migration: Add content_title and description to medias table...')

// 检查列是否存在
const tableInfo = db.pragma("table_info('medias')")
const hasContentTitle = tableInfo.some(col => col.name === 'content_title')
const hasDescription = tableInfo.some(col => col.name === 'description')

if (hasContentTitle && hasDescription) {
    console.log('✓ Columns already exist, skipping migration.')
} else {
    db.transaction(() => {
        if (!hasContentTitle) {
            db.exec(`ALTER TABLE medias ADD COLUMN content_title TEXT DEFAULT NULL`)
            console.log('✓ Added content_title column')
        }
        if (!hasDescription) {
            db.exec(`ALTER TABLE medias ADD COLUMN description TEXT DEFAULT NULL`)
            console.log('✓ Added description column')
        }
    })()
}

db.close()
console.log('Migration completed!')
