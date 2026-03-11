import {MeiliSearch} from 'meilisearch'

const MEILI_HOST = process.env.MEILI_HOST || 'http://localhost:7700'

let client: MeiliSearch | null = null

export function getMeiliClient(): MeiliSearch {
    if (!client) {
        client = new MeiliSearch({
            host: MEILI_HOST,
        })
    }
    return client
}

export async function ensureMeiliConnected(): Promise<boolean> {
    try {
        const meili = getMeiliClient()
        await meili.health()
        console.log('[meilisearch] Connected successfully')
        return true
    } catch (error) {
        console.error('[meilisearch] Connection failed:', error)
        return false
    }
}

// 产品索引名称
export const PRODUCTS_INDEX = 'products'

// 创建产品索引配置
export async function setupProductsIndex(): Promise<void> {
    const meili = getMeiliClient()

    try {
        // 获取或创建索引
        const index = await meili.getIndex(PRODUCTS_INDEX)
        console.log('[meilisearch] Index already exists:', PRODUCTS_INDEX)

        // 更新设置
        await updateIndexSettings(index)
    } catch {
        // 索引不存在，创建它
        console.log('[meilisearch] Creating index:', PRODUCTS_INDEX)
        await meili.createIndex(PRODUCTS_INDEX, {
            primaryKey: 'product_id',
        })

        const index = meili.index(PRODUCTS_INDEX)
        await updateIndexSettings(index)
    }
}

// 更新索引设置
async function updateIndexSettings(index: any): Promise<void> {
    // 配置可搜索字段和属性
    await index.updateSettings({
        searchableAttributes: [
            'title',
            'manufacturer',
            'voice_actors',
            'artists',
            'scenario',
            'model_number',
            'note_raw',
        ],
        filterableAttributes: [
            'manufacturer',
            'release_date',
            'model_number',
        ],
        sortableAttributes: [
            'product_id',
            'release_date',
        ],
        // 排序规则：将 exactness 提前，优先匹配完整型号
        rankingRules: [
            'words',
            'exactness',
            'typo',
            'proximity',
            'attribute',
            'sort',
        ],
        // 中日文分词配置
        synonyms: {},
        // 停用词（可选）
        stopWords: [],
    })

    console.log('[meilisearch] Index settings updated')
}

// 删除索引
export async function deleteProductsIndex(): Promise<void> {
    const meili = getMeiliClient()
    try {
        await meili.deleteIndex(PRODUCTS_INDEX)
        console.log('[meilisearch] Deleted index:', PRODUCTS_INDEX)
    } catch (error) {
        console.log('[meilisearch] Index does not exist:', PRODUCTS_INDEX)
    }
}
