import {getMeiliClient, PRODUCTS_INDEX} from './client'
import type {SearchParams} from 'meilisearch'

export interface ProductSearchDoc {
    product_id: string
    title: string
    manufacturer?: string
    voice_actors?: string[]
    artists?: string[]
    scenario?: string
    model_number?: string
    release_date?: string
    price?: string
    url?: string
    images?: string[]
    note_raw?: string
}

export interface ProductSearchResult {
    products: ProductSearchDoc[]
    total: number
    page: number
    totalPages: number
}

// 索引单个产品
export async function indexProduct(product: ProductSearchDoc): Promise<void> {
    const meili = getMeiliClient()
    const index = meili.index(PRODUCTS_INDEX)
    await index.addDocuments([product])
}

// 批量索引产品
export async function bulkIndexProducts(
    products: ProductSearchDoc[],
    onProgress?: (processed: number, total: number) => void
): Promise<void> {
    const meili = getMeiliClient()
    const index = meili.index(PRODUCTS_INDEX)

    // Meilisearch 批量添加文档
    const response = await index.addDocuments(products)

    console.log(`[meilisearch] Added ${products.length} documents, task uid: ${response.taskUid}`)

    if (onProgress) {
        onProgress(products.length, products.length)
    }
}

// 搜索产品
export async function searchProducts(
    query: string,
    options: {
        page?: number
        limit?: number
        filter?: string
    } = {}
): Promise<ProductSearchResult> {
    const meili = getMeiliClient()
    const index = meili.index(PRODUCTS_INDEX)

    const {page = 1, limit = 20, filter} = options

    const searchParams: SearchParams = {
        offset: (page - 1) * limit,
        limit: limit,
        // 高亮配置
        attributesToHighlight: ['title', 'manufacturer'],
        highlightPreTag: '<mark>',
        highlightPostTag: '</mark>',
        // 裁剪长文本
        attributesToCrop: ['note_raw'],
        cropLength: 100,
        // 匹配信息
        showMatchesPosition: true,
    }

    if (filter) {
        searchParams.filter = filter
    }

    const response = await index.search(query, searchParams)

    // 转换结果
    const products = response.hits.map(hit => {
        const doc = hit as any
        return {
            ...doc,
            // 如果有高亮结果，添加到文档
            ...(doc._formatted?.title && {highlight_title: doc._formatted.title}),
        } as ProductSearchDoc
    })

    return {
        products,
        total: response.estimatedTotalHits || response.totalHits || 0,
        page,
        totalPages: Math.ceil((response.estimatedTotalHits || response.totalHits || 0) / limit),
    }
}

// 删除产品索引
export async function deleteProductIndex(productId: string): Promise<void> {
    const meili = getMeiliClient()
    const index = meili.index(PRODUCTS_INDEX)
    await index.deleteDocument(productId)
}

// 清空所有产品
export async function clearAllProducts(): Promise<void> {
    const meili = getMeiliClient()
    const index = meili.index(PRODUCTS_INDEX)
    await index.deleteAllDocuments()
    console.log('[meilisearch] All documents deleted')
}

// 获取索引统计
export async function getIndexStats(): Promise<{
    totalDocuments: number
    isIndexing: boolean
}> {
    const meili = getMeiliClient()
    const index = meili.index(PRODUCTS_INDEX)
    const stats = await index.getStats()

    return {
        totalDocuments: stats.numberOfDocuments,
        isIndexing: stats.isIndexing,
    }
}
