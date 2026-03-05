// 测试 DiscEditor 数据流
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testDiscEditorDataFlow() {
  console.log('=== 测试 DiscEditor 数据流 ===\n');

  try {
    // 1. 获取种子列表
    console.log('1. 获取种子列表...');
    const torrentsRes = await fetch(`${BASE_URL}/api/qb/torrents/info`);
    const torrentsData = await torrentsRes.json();

    if (!torrentsData.success) {
      console.error('❌ 获取种子列表失败:', torrentsData.error);
      return;
    }

    const torrents = JSON.parse(torrentsData.data);
    console.log(`✅ 成功获取 ${torrents.length} 个种子\n`);

    if (torrents.length === 0) {
      console.log('⚠️  没有种子数据');
      return;
    }

    // 2. 选择第一个种子测试
    const testTorrent = torrents[0];
    const hash = testTorrent.qb_torrent.hash;
    const name = testTorrent.qb_torrent.name;

    console.log('2. 测试种子信息:');
    console.log(`   名称: ${name}`);
    console.log(`   Hash: ${hash}`);
    console.log(`   ID: ${testTorrent.id}\n`);

    // 3. 测试从数据库获取文件（应该为空或有数据）
    console.log('3. 尝试从数据库获取文件...');
    const dbFilesRes = await fetch(`${BASE_URL}/api/torrents/files?hash=${hash}`);
    const dbFilesData = await dbFilesRes.json();

    if (dbFilesData.success) {
      const dbFiles = JSON.parse(dbFilesData.data);
      console.log(`✅ 数据库中有 ${dbFiles.length} 个文件`);
      if (dbFiles.length > 0) {
        console.log('   第一个文件结构:', JSON.stringify(dbFiles[0], null, 2));
      }
    } else {
      console.log('⚠️  从数据库获取文件失败:', dbFilesData.error);
    }
    console.log('');

    // 4. 测试从 qBittorrent 同步文件
    console.log('4. 从 qBittorrent 同步文件...');
    const qbFilesRes = await fetch(`${BASE_URL}/api/qb/torrents/files?hash=${hash}`);
    const qbFilesData = await qbFilesRes.json();

    if (!qbFilesData.success) {
      console.error('❌ 从 qBittorrent 获取文件失败:', qbFilesData.error);
      return;
    }

    const qbFiles = JSON.parse(qbFilesData.data);
    console.log(`✅ 成功从 qBittorrent 获取并保存 ${qbFiles.length} 个文件`);

    if (qbFiles.length > 0) {
      console.log('\n   第一个文件的数据结构:');
      console.log('   ', JSON.stringify(qbFiles[0], null, 2));

      // 验证 FileItem 结构
      const firstFile = qbFiles[0];
      const hasRequiredFields = firstFile.id && firstFile.name &&
                                typeof firstFile.size === 'number' &&
                                typeof firstFile.progress === 'number';

      if (hasRequiredFields) {
        console.log('\n   ✅ 文件结构正确，包含所需字段:');
        console.log(`      - id: ${firstFile.id}`);
        console.log(`      - name: ${firstFile.name}`);
        console.log(`      - size: ${firstFile.size} bytes`);
        console.log(`      - progress: ${firstFile.progress}`);
      } else {
        console.log('\n   ❌ 文件结构不正确，缺少必需字段');
      }
    }
    console.log('');

    // 5. 测试卷数据获取
    if (testTorrent.id) {
      console.log('5. 获取卷数据...');
      const volumesRes = await fetch(`${BASE_URL}/api/volumes?torrent_id=${testTorrent.id}`);
      const volumesData = await volumesRes.json();

      if (volumesData.success) {
        const volumes = JSON.parse(volumesData.data);
        console.log(`✅ 获取到 ${volumes.length} 个卷\n`);
      } else {
        console.log(`⚠️  暂无卷数据\n`);
      }
    }

    console.log('=== 测试完成 ===');
    console.log('\n📋 总结:');
    console.log(`   - 种子数: ${torrents.length}`);
    console.log(`   - 测试种子文件数: ${qbFiles.length}`);
    console.log(`   - 数据格式: ${qbFiles.length > 0 ? 'FileItem ✅' : '无数据'}`);

  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
    console.error(error.stack);
  }
}

// 运行测试
testDiscEditorDataFlow();

