import {getMeiliClient} from './client'
import type {SearchParams} from 'meilisearch'

// Bangumi 搜索索引名称 (与 products 索引区分)
export const BANGUMI_INDEX = 'bangumi_subjects'

// Bangumi 搜索文档类型
export interface BangumiSearchDoc {
    /** 条目 ID */
    subject_id: number
    /** 原名 */
    name: string
    /** 中文名 */
    name_cn: string
    /** 条目类型 ID */
    type: number
    /** 条目类型名称 */
    type_name: string
    /** 平台 ID */
    platform?: number
    /** 平台名称 */
    platform_name?: string
    /** 简介 */
    summary: string
    /** 放送/发售日期 */
    date?: string
    /** 评分 */
    score?: number
    /** 排名 */
    rank?: number
    /** 条目页面 URL */
    url: string
    /** 标签 */
    tags?: string[]
    /** 是否 NSFW */
    nsfw: boolean
}

// 搜索结果类型
export interface BangumiSearchResult {
    subjects: BangumiSearchDoc[]
    total: number
    page: number
    totalPages: number
}

// 过滤选项
export interface BangumiSearchOptions {
    page?: number
    limit?: number
    type?: number
    platform?: number
    minScore?: number
    maxScore?: number
    nsfw?: boolean
}

// ============ 索引管理 ============

/**
 * 创建 Bangumi 搜索索引
 */
export async function setupBangumiIndex(): Promise<void> {
    const meili = getMeiliClient()

    try {
        // 获取或创建索引
        const index = await meili.getIndex(BANGUMI_INDEX)
        console.log('[meilisearch] Bangumi index already exists:', BANGUMI_INDEX)
        await updateBangumiIndexSettings(index)
    } catch {
        // 索引不存在，创建它
        console.log('[meilisearch] Creating Bangumi index:', BANGUMI_INDEX)
        await meili.createIndex(BANGUMI_INDEX, {
            primaryKey: 'subject_id',
        })

        const index = meili.index(BANGUMI_INDEX)
        await updateBangumiIndexSettings(index)
    }
}

/**
 * 更新 Bangumi 索引设置
 */
async function updateBangumiIndexSettings(index: any): Promise<void> {
    await index.updateSettings({
        // 可搜索字段
        searchableAttributes: [
            'name',
            'name_cn',
            'summary',
            'tags',
        ],
        // 可过滤字段
        filterableAttributes: [
            'type',
            'platform',
            'score',
            'nsfw',
            'tags',
        ],
        // 可排序字段
        sortableAttributes: [
            'subject_id',
            'score',
            'rank',
            'date',
        ],
        // 排序规则
        rankingRules: [
            'words',
            'typo',
            'proximity',
            'attribute',
            'sort',
            'exactness',
        ],
        // 同义词
        synonyms: {
            'tv': ['television', '电视'],
            'ova': ['original video animation'],
            '剧场版': ['movie', '电影'],
        },
        // 停用词
        stopWords: [],
    })

    console.log('[meilisearch] Bangumi index settings updated')
}

/**
 * 删除 Bangumi 索引
 */
export async function deleteBangumiIndex(): Promise<void> {
    const meili = getMeiliClient()
    try {
        await meili.deleteIndex(BANGUMI_INDEX)
        console.log('[meilisearch] Deleted Bangumi index:', BANGUMI_INDEX)
    } catch (error) {
        console.log('[meilisearch] Bangumi index does not exist:', BANGUMI_INDEX)
    }
}

// ============ 文档操作 ============

/**
 * 索引单个 Bangumi 条目
 */
export async function indexBangumiSubject(subject: BangumiSearchDoc): Promise<void> {
    const meili = getMeiliClient()
    const index = meili.index(BANGUMI_INDEX)
    await index.addDocuments([subject])
}

/**
 * 批量索引 Bangumi 条目
 */
export async function bulkIndexBangumiSubjects(
    subjects: BangumiSearchDoc[],
    onProgress?: (processed: number, total: number) => void
): Promise<void> {
    const meili = getMeiliClient()
    const index = meili.index(BANGUMI_INDEX)

    const response = await index.addDocuments(subjects)
    console.log(`[meilisearch] Added ${subjects.length} Bangumi documents, task uid: ${response.taskUid}`)

    if (onProgress) {
        onProgress(subjects.length, subjects.length)
    }
}

/**
 * 删除单个 Bangumi 条目
 */
export async function deleteBangumiSubject(subjectId: number): Promise<void> {
    const meili = getMeiliClient()
    const index = meili.index(BANGUMI_INDEX)
    await index.deleteDocument(subjectId)
}

/**
 * 清空所有 Bangumi 条目
 */
export async function clearAllBangumiSubjects(): Promise<void> {
    const meili = getMeiliClient()
    const index = meili.index(BANGUMI_INDEX)
    await index.deleteAllDocuments()
    console.log('[meilisearch] All Bangumi documents deleted')
}

// ============ 搜索 ============

/**
 * 搜索 Bangumi 条目
 */
export async function searchBangumi(
    query: string,
    options: BangumiSearchOptions = {}
): Promise<BangumiSearchResult> {
    const meili = getMeiliClient()
    const index = meili.index(BANGUMI_INDEX)

    const {
        page = 1,
        limit = 20,
        type,
        platform,
        minScore,
        maxScore,
        nsfw,
    } = options

    // 构建过滤条件
    const filters: string[] = []

    if (type !== undefined) {
        filters.push(`type = ${type}`)
    }

    if (platform !== undefined) {
        filters.push(`platform = ${platform}`)
    }

    if (minScore !== undefined || maxScore !== undefined) {
        const min = minScore ?? 0
        const max = maxScore ?? 10
        filters.push(`score ${min} TO ${max}`)
    }

    if (nsfw !== undefined) {
        filters.push(`nsfw = ${nsfw}`)
    }

    const searchParams: SearchParams = {
        offset: (page - 1) * limit,
        limit: limit,
        // 高亮配置
        attributesToHighlight: ['name', 'name_cn', 'summary'],
        highlightPreTag: '<mark>',
        highlightPostTag: '</mark>',
        // 裁剪长文本
        attributesToCrop: ['summary'],
        cropLength: 200,
        // 匹配信息
        showMatchesPosition: true,
        // 排序
        sort: ['rank:asc'],
    }

    if (filters.length > 0) {
        searchParams.filter = filters
    }

    const response = await index.search(query, searchParams)

    // 转换结果
    const subjects = response.hits.map(hit => {
        const doc = hit as any
        return {
            subject_id: doc.subject_id,
            name: doc.name,
            name_cn: doc.name_cn,
            type: doc.type,
            type_name: doc.type_name,
            platform: doc.platform,
            platform_name: doc.platform_name,
            summary: doc.summary,
            date: doc.date,
            score: doc.score,
            rank: doc.rank,
            url: doc.url,
            tags: doc.tags,
            nsfw: doc.nsfw,
            // 高亮结果
            ...(doc._formatted?.name_cn && {highlight_name_cn: doc._formatted.name_cn}),
            ...(doc._formatted?.summary && {highlight_summary: doc._formatted.summary}),
        } as BangumiSearchDoc & { highlight_name_cn?: string; highlight_summary?: string }
    })

    return {
        subjects,
        total: response.estimatedTotalHits ?? 0,
        page,
        totalPages: Math.ceil((response.estimatedTotalHits ?? 0) / limit),
    }
}

/**
 * 获取 Bangumi 索引统计
 */
export async function getBangumiIndexStats(): Promise<{
    totalDocuments: number
    isIndexing: boolean
}> {
    const meili = getMeiliClient()
    const index = meili.index(BANGUMI_INDEX)
    const stats = await index.getStats()

    return {
        totalDocuments: stats.numberOfDocuments,
        isIndexing: stats.isIndexing,
    }
}

/**
 * 获取类型分布统计
 */
export async function getBangumiTypeStats(): Promise<Record<number, number>> {
    const meili = getMeiliClient()
    const index = meili.index(BANGUMI_INDEX)

    // 使用 facet search 获取类型分布
    const response = await index.search('', {
        facets: ['type'],
        limit: 0,
    })

    const typeStats: Record<number, number> = {}
    const facetDistribution = response.facetDistribution?.type

    if (facetDistribution) {
        for (const [type, count] of Object.entries(facetDistribution)) {
            typeStats[parseInt(type)] = count
        }
    }

    return typeStats
}
