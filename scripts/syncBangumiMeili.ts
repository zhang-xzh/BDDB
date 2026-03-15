// Bangumi 数据同步到 Meilisearch 脚本
// 用法: npx tsx scripts/syncBangumiMeili.ts [command] [options]
//
// 命令:
//   full     - 全量同步所有 Bangumi 条目
//   rebuild  - 重建索引（删除后全量同步）
//   stats    - 显示索引统计
//   clear    - 清空索引

import {
    ensureMeiliConnected,
    setupBangumiIndex,
    deleteBangumiIndex,
    bulkIndexBangumiSubjects,
    clearAllBangumiSubjects,
    getBangumiIndexStats,
    BANGUMI_INDEX,
} from '../lib/meilisearch'
import {
    getAllSubjects,
    getTotalSubjectsCount,
    type BangumiSubjectDoc,
    SUBJECT_TYPE_NAMES,
    getSubjectCoverUrl,
    getSubjectUrl,
} from '../lib/mongodb/bangumiRepository'
import type {BangumiSearchDoc} from '../lib/meilisearch/bangumiSearch'

/**
 * 将 BangumiSubjectDoc 转换为搜索文档
 */
function convertToSearchDoc(subject: BangumiSubjectDoc): BangumiSearchDoc {
    return {
        subject_id: subject._id,
        name: subject.name,
        name_cn: subject.name_cn || '',
        type: subject.type,
        type_name: SUBJECT_TYPE_NAMES[subject.type] || '未知',
        platform: subject.platform,
        platform_name: subject.platform_info?.type_cn,
        summary: subject.summary || '',
        date: subject.date,
        score: subject.meta?.score,
        rank: subject.meta?.rank,
        cover_url: getSubjectCoverUrl(subject._id, 'm'),
        url: getSubjectUrl(subject._id),
        tags: subject.meta?.tags || [],
        nsfw: subject.nsfw || false,
    }
}

/**
 * 全量同步所有 Bangumi 条目
 */
async function syncAllBangumiSubjects(): Promise<void> {
    console.log('[syncBangumiMeili] Starting full sync...')

    const total = await getTotalSubjectsCount()
    console.log(`[syncBangumiMeili] Total subjects to sync: ${total}`)

    if (total === 0) {
        console.log('[syncBangumiMeili] No subjects found in MongoDB')
        return
    }

    // 确保索引存在
    await setupBangumiIndex()

    const batchSize = 1000
    let processed = 0
    let skip = 0

    while (processed < total) {
        const subjects = await getAllSubjects({batchSize, skip})

        if (subjects.length === 0) break

        // 转换为搜索文档
        const docs = subjects.map(convertToSearchDoc)

        // 批量索引
        await bulkIndexBangumiSubjects(docs)

        processed += subjects.length
        skip += batchSize

        const percent = Math.round((processed / total) * 100)
        process.stdout.write(`\r[syncBangumiMeili] Progress: ${processed}/${total} (${percent}%)`)
    }

    console.log('\n[syncBangumiMeili] Sync completed')

    // 显示统计
    const stats = await getBangumiIndexStats()
    console.log(`[syncBangumiMeili] Indexed documents: ${stats.totalDocuments}`)
}

/**
 * 重建索引
 */
async function rebuildBangumiIndex(): Promise<void> {
    console.log('[syncBangumiMeili] Rebuilding index...')

    // 删除旧索引
    await deleteBangumiIndex()

    // 重新同步
    await syncAllBangumiSubjects()

    console.log('[syncBangumiMeili] Rebuild completed')
}

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
                await syncAllBangumiSubjects()
                break
            case 'rebuild':
                await rebuildBangumiIndex()
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
