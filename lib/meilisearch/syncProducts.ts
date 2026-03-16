import {getProductsCollection, type MongoProduct} from '@/lib/mongodb'
import {deleteProductsIndex, setupProductsIndex} from './client'
import {bulkIndexProducts, clearAllProducts, type ProductSearchDoc} from './productSearch'

// 将 MongoDB 产品转换为 Meilisearch 文档
function convertToSearchDoc(product: MongoProduct): ProductSearchDoc {
    return {
        product_id: product.product_id,
        title: product.title,
        manufacturer: product.attributes?.メーカー,
        voice_actors: product.attributes?.声優,
        artists: product.attributes?.原画,
        scenario: product.attributes?.シナリオ,
        model_number: product.attributes?.型番,
        release_date: product.attributes?.発売日,
        price: product.attributes?.定価,
        url: product.url,
        images: product.images,
        note_raw: product.note_raw,
    }
}

// 全量同步
export async function syncAllProducts(
    onProgress?: (processed: number, total: number) => void
): Promise<{ total: number; indexed: number }> {
    const collection = getProductsCollection()

    // 获取总数
    const total = await collection.countDocuments()
    console.log(`[meilisearch-sync] Total products to sync: ${total}`)

    if (total === 0) {
        return {total: 0, indexed: 0}
    }

    // 清空现有索引
    await clearAllProducts()

    // 批量处理
    const batchSize = 1000  // Meilisearch 推荐批量大小
    let processed = 0
    let lastId: string | null = null

    while (processed < total) {
        const query: Record<string, any> = {}
        if (lastId) {
            query.product_id = {$gt: lastId}
        }

        const products = await collection
            .find(query)
            .sort({product_id: 1})
            .limit(batchSize)
            .toArray()

        if (products.length === 0) break

        const docs = products.map(convertToSearchDoc)
        await bulkIndexProducts(docs)

        processed += products.length
        lastId = products[products.length - 1].product_id

        onProgress?.(processed, total)
        console.log(`[meilisearch-sync] Progress: ${processed}/${total}`)
    }

    console.log(`[meilisearch-sync] Completed: ${processed} products indexed`)
    return {total, indexed: processed}
}

// 增量同步（按 product_id 列表）
export async function syncProductsByIds(productIds: string[]): Promise<void> {
    const collection = getProductsCollection()

    const products = await collection
        .find({product_id: {$in: productIds}})
        .toArray()

    if (products.length === 0) return

    const docs = products.map(convertToSearchDoc)
    await bulkIndexProducts(docs)

    console.log(`[meilisearch-sync] Synced ${products.length} products`)
}

// 重建索引（删除并重新创建）
export async function rebuildIndex(): Promise<void> {
    console.log('[meilisearch-sync] Rebuilding index...')
    await deleteProductsIndex()
    await setupProductsIndex()
    await syncAllProducts()
    console.log('[meilisearch-sync] Rebuild completed')
}

// 同步单个产品
export async function syncSingleProduct(productId: string): Promise<void> {
    const collection = getProductsCollection()
    const product = await collection.findOne({product_id: productId})

    if (!product) {
        console.log(`[meilisearch-sync] Product not found: ${productId}`)
        return
    }

    const doc = convertToSearchDoc(product)
    await bulkIndexProducts([doc])
    console.log(`[meilisearch-sync] Synced product: ${productId}`)
}
