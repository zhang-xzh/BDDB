// Bangumi 数据同步到 Meilisearch 脚本
// 用法: npx tsx scripts/syncBangumiMeili.ts [command] [options]
//
// 命令:
//   full     - 全量同步所有 Bangumi 条目
//   rebuild  - 重建索引（删除后全量同步）
//   stats    - 显示索引统计
//   clear    - 清空索引

import {
    BANGUMI_INDEX,
    clearAllBangumiSubjects,
    deleteBangumiIndex,
    ensureMeiliConnected,
    getBangumiIndexStats,
    rebuildBangumiIndex,
    syncAllBangumiSubjects,
} from '@/lib/meilisearch'

/**
 * 显示索引统计
 */
async function showBangumiStats(): Promise<void> {
    console.log('[syncBangumiMeili] Bangumi index stats:')

    const stats = await getBangumiIndexStats()
    console.log(`  Total documents: ${stats.totalDocuments}`)
    console.log(`  Is indexing: ${stats.isIndexing}`)
    console.log(`  Index name: ${BANGUMI_INDEX}`)
}

/**
 * 清空索引
 */
async function clearBangumiIndex(): Promise<void> {
    console.log('[syncBangumiMeili] Clearing Bangumi index...')
    await clearAllBangumiSubjects()
    console.log('[syncBangumiMeili] All documents cleared')
}

/**
 * 全量同步
 */
async function syncAll(): Promise<void> {
    console.log('[syncBangumiMeili] Starting full sync...')
    const result = await syncAllBangumiSubjects((processed, total) => {
        const percent = Math.round((processed / total) * 100)
        process.stdout.write(`\r[syncBangumiMeili] Progress: ${processed}/${total} (${percent}%)`)
    })
    console.log('\n[syncBangumiMeili] Sync completed')
    console.log(`[syncBangumiMeili] Indexed documents: ${result.indexed}`)
}

/**
 * 重建索引
 */
async function rebuild(): Promise<void> {
    console.log('[syncBangumiMeili] Rebuilding index...')
    const result = await rebuildBangumiIndex((processed, total) => {
        const percent = Math.round((processed / total) * 100)
        process.stdout.write(`\r[syncBangumiMeili] Progress: ${processed}/${total} (${percent}%)`)
    })
    console.log('\n[syncBangumiMeili] Rebuild completed')
    console.log(`[syncBangumiMeili] Indexed documents: ${result.indexed}`)
}

/**
 * 主函数
 */
async function main(): Promise<void> {
    const command = process.argv[2] || 'full'

    console.log(`[syncBangumiMeili] Command: ${command}`)

    // 检查 Meilisearch 连接
    const connected = await ensureMeiliConnected()
    if (!connected) {
        console.error('[syncBangumiMeili] Failed to connect to Meilisearch')
        process.exit(1)
    }

    try {
        switch (command) {
            case 'full':
                await syncAll()
                break
            case 'rebuild':
                await rebuild()
                break
            case 'stats':
                await showBangumiStats()
                break
            case 'clear':
                await clearBangumiIndex()
                break
            default:
                console.log(`[syncBangumiMeili] Unknown command: ${command}`)
                console.log('Usage: npx tsx scripts/syncBangumiMeili.ts [full|rebuild|stats|clear]')
                process.exit(1)
        }
    } catch (error) {
        console.error('[syncBangumiMeili] Error:', error)
        process.exit(1)
    }

    process.exit(0)
}

main()
