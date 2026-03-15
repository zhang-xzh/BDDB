import { MongoClient } from 'mongodb';

const MONGO_HOST = process.env.MONGO_HOST || 'localhost'
const MONGO_PORT = process.env.MONGO_PORT || '27017'
const MONGO_URI = process.env.MONGO_URI || `mongodb://${MONGO_HOST}:${MONGO_PORT}`

const PROD_DB = process.env.MONGO_DB_PROD || 'bddb_prod'
const DEV_DB = process.env.MONGO_DB_DEV || 'bddb_dev'

const COLLECTIONS = ['bddb_volumes', 'bddb_works', 'bddb_torrents', 'bddb_medias'];

async function migrate() {
    console.log(`[migrate] Connecting to ${MONGO_URI}`);
    console.log(`[migrate] From: ${PROD_DB} → To: ${DEV_DB}`);
    console.log(`[migrate] Collections: ${COLLECTIONS.join(', ')}`);

    const client = new MongoClient(MONGO_URI);

    try {
        await client.connect();
        console.log('[migrate] Connected to MongoDB\n');

        const prodDb = client.db(PROD_DB);
        const devDb = client.db(DEV_DB);

        for (const collName of COLLECTIONS) {
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`📦 迁移集合: ${collName}`);
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

            const sourceColl = prodDb.collection(collName);
            const targetColl = devDb.collection(collName);

            // 统计源数据
            const totalCount = await sourceColl.countDocuments();
            console.log(`   源数据量: ${totalCount}`);

            if (totalCount === 0) {
                console.log('   ⚠️ 跳过空集合\n');
                continue;
            }

            // 统计目标数据
            const targetCountBefore = await targetColl.countDocuments();
            console.log(`   目标现有: ${targetCountBefore}`);

            // 清空目标集合
            const deleteResult = await targetColl.deleteMany({});
            console.log(`   🗑️  已清空: ${deleteResult.deletedCount} 条`);

            // 批量迁移
            const batchSize = 1000;
            let processed = 0;
            let batchNum = 0;

            const cursor = sourceColl.find({});
            let batch: any[] = [];

            for await (const doc of cursor) {
                batch.push(doc);

                if (batch.length >= batchSize) {
                    batchNum++;
                    await targetColl.insertMany(batch);
                    processed += batch.length;
                    console.log(`   📥 批次 ${batchNum}: ${processed}/${totalCount}`);
                    batch = [];
                }
            }

            // 插入剩余数据
            if (batch.length > 0) {
                batchNum++;
                await targetColl.insertMany(batch);
                processed += batch.length;
                console.log(`   📥 批次 ${batchNum}: ${processed}/${totalCount}`);
            }

            // 复制索引
            const indexes = await sourceColl.indexes();
            let indexCount = 0;
            for (const index of indexes) {
                if (index.name !== '_id_') {
                    const indexSpec = { ...index };
                    delete (indexSpec as any).v;
                    delete (indexSpec as any).ns;
                    delete (indexSpec as any).key; // key 会作为第一个参数传递

                    try {
                        await targetColl.createIndex(index.key, indexSpec);
                        indexCount++;
                    } catch (e) {
                        // 忽略重复索引错误
                    }
                }
            }
            if (indexCount > 0) {
                console.log(`   🔍 复制索引: ${indexCount} 个`);
            }

            // 验证
            const targetCountAfter = await targetColl.countDocuments();
            console.log(`   ✅ 完成: ${targetCountAfter} 条文档\n`);
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎉 所有数据迁移完成！');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    } catch (error) {
        console.error('❌ 迁移失败:', error);
        process.exit(1);
    } finally {
        await client.close();
        console.log('[migrate] Connection closed');
    }
}

migrate();
