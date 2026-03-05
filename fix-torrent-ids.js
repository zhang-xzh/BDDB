// 修复 torrents 表中所有空的 ID
const Database = require('better-sqlite3');
const { customAlphabet } = require('nanoid');

const generateId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 16);

const db = new Database('./data/bddb.sqlite');

console.log('开始修复 torrents 表的空 ID...\n');

// 1. 检查有多少条记录没有 ID
const countStmt = db.prepare('SELECT COUNT(*) as count FROM torrents WHERE id IS NULL');
const { count } = countStmt.get();
console.log(`发现 ${count} 条没有 ID 的种子记录`);

if (count === 0) {
  console.log('所有种子都已有 ID，无需修复。');
  db.close();
  process.exit(0);
}

// 2. 批量更新所有空 ID 的记录
console.log('开始批量更新...');

const transaction = db.transaction(() => {
  // 获取所有没有 ID 的记录的 rowid
  const nullIdRecords = db.prepare('SELECT rowid FROM torrents WHERE id IS NULL').all();

  const updateStmt = db.prepare('UPDATE torrents SET id = ? WHERE rowid = ?');

  let updated = 0;
  for (const record of nullIdRecords) {
    const newId = generateId();
    updateStmt.run(newId, record.rowid);
    updated++;

    if (updated % 100 === 0) {
      console.log(`已更新 ${updated}/${nullIdRecords.length} 条记录...`);
    }
  }

  return updated;
});

const updated = transaction();

console.log(`\n✅ 成功更新 ${updated} 条记录`);

// 3. 验证结果
const remainingNullCount = db.prepare('SELECT COUNT(*) as count FROM torrents WHERE id IS NULL').get().count;
console.log(`剩余空 ID 记录数: ${remainingNullCount}`);

if (remainingNullCount === 0) {
  console.log('✅ 所有种子记录都已有 ID！');
} else {
  console.log('⚠️  仍有部分记录没有 ID，请检查。');
}

db.close();
console.log('\n修复完成！');

