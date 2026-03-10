// Meilisearch 数据同步脚本
// 用法: npx tsx scripts/syncMeilisearch.ts [command] [options]
//
// Commands:
//   full        - 全量同步所有产品
//   rebuild     - 重建索引并全量同步
//   stats       - 显示索引统计
//   clear       - 清空所有文档

import {
    ensureMeiliConnected,
    setupProductsIndex,
    syncAllProducts,
    rebuildIndex,
    getIndexStats,
    clearAllProducts,
} from '../lib/meilisearch'

async function main() {
    const command = process.argv[2] || 'full'

    console.log(`[syncMeilisearch] Command: ${command}`)

    // 检查连接
    const connected = await ensureMeiliConnected()
    if (!connected) {
        console.error('[syncMeilisearch] Failed to connect to Meilisearch')
        process.exit(1)
    }

    switch (command) {
        case 'full':
            await setupProductsIndex()
            await syncAllProducts((processed, total) => {
                const percent = Math.round((processed / total) * 100)
                process.stdout.write(`\r[syncMeilisearch] Progress: ${processed}/${total} (${percent}%)`)
            })
            console.log('\n[syncMeilisearch] Sync completed')
            break

        case 'rebuild':
            await rebuildIndex()
            console.log('[syncMeilisearch] Rebuild completed')
            break

        case 'stats':
            const stats = await getIndexStats()
            console.log('[syncMeilisearch] Index stats:')
            console.log(`  - Total documents: ${stats.totalDocuments}`)
            console.log(`  - Is indexing: ${stats.isIndexing}`)
            break

        case 'clear':
            await clearAllProducts()
            console.log('[syncMeilisearch] All documents cleared')
            break

        default:
            console.log(`[syncMeilisearch] Unknown command: ${command}`)
            console.log('Usage: npx tsx scripts/syncMeilisearch.ts [full|rebuild|stats|clear]')
            process.exit(1)
    }

    process.exit(0)
}

main().catch(error => {
    console.error('[syncMeilisearch] Error:', error)
    process.exit(1)
})
