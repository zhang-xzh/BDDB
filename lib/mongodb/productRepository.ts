import {getMongoClient, getSurugaYaCollection} from './connection'
import type {MongoClient, ObjectId} from 'mongodb'

// Suruga Ya 产品实际数据结构
export interface MongoProduct {
    _id: ObjectId  // MongoDB ObjectId
    product_id: string              // 商品ID (如: "109001543001")
    title: string                   // 标题
    url: string                     // 产品URL
    images: string[]                // 图片URL数组
    note_raw?: string               // 描述 (HTML格式)
    tracklist?: TrackList[]         // 曲目列表
    attributes: ProductAttributes   // 产品属性
}

export interface TrackList {
    disc: string        // 光盘名称 (如: "Disc.1")
    tracks: string[]    // 曲目数组
}

export interface ProductAttributes {
    管理番号?: string
    メーカー?: string               // 制作商
    発売日?: string                // 发售日 (格式: "2021/08/26")
    定価?: string                  // 定价 (格式: "8,800円")
    型番?: string                  // 型号
    シナリオ?: string              // 剧本
    キャラクターデザイン?: string  // 角色设计
    原画?: string[]                // 原画师
    音楽?: string                  // 音乐
    声優?: string[]                // 声优
    [key: string]: any             // 其他未知属性
}

// 产品查询参数
export interface ProductQuery {
    search?: string         // 搜索关键词 (支持商品ID、标题)
    manufacturer?: string   // 制作商
    minPrice?: number       // 最低价格
    maxPrice?: number       // 最高价格
    releaseDateFrom?: string // 发售日从 (格式: "2021-01-01")
    releaseDateTo?: string  // 发售日到 (格式: "2021-12-31")
    page?: number           // 页码
    limit?: number          // 每页数量
}

// 产品查询结果
export interface ProductResult {
    products: MongoProduct[]
    total: number
    page: number
    limit: number
    totalPages: number
}

// 获取 MongoDB 客户端实例
export function getMongoClientInstance(): MongoClient {
    return getMongoClient()
}

// 获取产品集合（suruga_ya 数据库）
export function getProductsCollection() {
    return getSurugaYaCollection<MongoProduct>('products')
}

/**
 * 根据商品ID查询产品
 * @param productId 商品ID (product_id 字段)
 */
export async function getProductByProductId(productId: string): Promise<MongoProduct | null> {
    try {
        const collection = getProductsCollection()
        const product = await collection.findOne({product_id: productId})
        return product || null
    } catch (error) {
        console.error('[mongodb] getProductByProductId error:', error)
        return null
    }
}

/**
 * 根据商品编号（管理番号）查询产品
 * @param code 商品编号 (attributes.管理番号 字段)
 */
export async function getProductByCode(code: string): Promise<MongoProduct | null> {
    try {
        const collection = getProductsCollection()
        const product = await collection.findOne({'attributes.管理番号': code})
        return product || null
    } catch (error) {
        console.error('[mongodb] getProductByCode error:', error)
        return null
    }
}

/**
 * 根据型号（型番）查询产品
 * @param modelNumber 型号 (attributes.型番 字段)
 */
export async function getProductByModelNumber(modelNumber: string): Promise<MongoProduct | null> {
    try {
        const collection = getProductsCollection()
        const product = await collection.findOne({'attributes.型番': modelNumber})
        return product || null
    } catch (error) {
        console.error('[mongodb] getProductByModelNumber error:', error)
        return null
    }
}

/**
 * 根据型番列表批量查询产品（用于 volume 列表关联）
 * @param modelNumbers 型番数组 (= bddb_volumes.catalog_no)
 */
export async function getProductsByModelNumbers(modelNumbers: string[]): Promise<Map<string, MongoProduct>> {
    try {
        const collection = getProductsCollection()
        const products = await collection
            .find({'attributes.型番': {$in: modelNumbers}})
            .toArray()
        const map = new Map<string, MongoProduct>()
        for (const p of products) {
            if (p.attributes.型番) map.set(p.attributes.型番, p)
        }
        return map
    } catch (error) {
        console.error('[mongodb] getProductsByModelNumbers error:', error)
        return new Map()
    }
}

/*
 * @param title 标题关键词
 * @param limit 返回数量限制
 */
export async function searchProductsByTitle(
    title: string,
    limit: number = 20
): Promise<MongoProduct[]> {
    try {
        const collection = getProductsCollection()
        const regex = new RegExp(title, 'i') // 不区分大小写
        const products = await collection
            .find({title: regex})
            .limit(limit)
            .toArray()
        return products
    } catch (error) {
        console.error('[mongodb] searchProductsByTitle error:', error)
        return []
    }
}

/**
 * 根据制作商查询产品
 * @param manufacturer 制作商名称
 * @param limit 返回数量限制
 */
export async function getProductsByManufacturer(
    manufacturer: string,
    limit: number = 20
): Promise<MongoProduct[]> {
    try {
        const collection = getProductsCollection()
        const products = await collection
            .find({'attributes.メーカー': manufacturer})
            .limit(limit)
            .toArray()
        return products
    } catch (error) {
        console.error('[mongodb] getProductsByManufacturer error:', error)
        return []
    }
}

/**
 * 根据声优查询产品
 * @param voiceActor 声优名称
 * @param limit 返回数量限制
 */
export async function getProductsByVoiceActor(
    voiceActor: string,
    limit: number = 20
): Promise<MongoProduct[]> {
    try {
        const collection = getProductsCollection()
        const products = await collection
            .find({'attributes.声優': voiceActor})
            .limit(limit)
            .toArray()
        return products
    } catch (error) {
        console.error('[mongodb] getProductsByVoiceActor error:', error)
        return []
    }
}

/**
 * 根据原画师查询产品
 * @param artist 原画师名称
 * @param limit 返回数量限制
 */
export async function getProductsByArtist(
    artist: string,
    limit: number = 20
): Promise<MongoProduct[]> {
    try {
        const collection = getProductsCollection()
        const products = await collection
            .find({'attributes.原画': artist})
            .limit(limit)
            .toArray()
        return products
    } catch (error) {
        console.error('[mongodb] getProductsByArtist error:', error)
        return []
    }
}

/**
 * 根据剧本查询产品
 * @param scenario 剧本名称
 * @param limit 返回数量限制
 */
export async function getProductsByScenario(
    scenario: string,
    limit: number = 20
): Promise<MongoProduct[]> {
    try {
        const collection = getProductsCollection()
        const products = await collection
            .find({'attributes.シナリオ': scenario})
            .limit(limit)
            .toArray()
        return products
    } catch (error) {
        console.error('[mongodb] getProductsByScenario error:', error)
        return []
    }
}

/**
 * 判断搜索词是否适合使用全文索引
 * 纯数字（商品ID）、型番格式、过短的词用正则匹配
 */
function shouldUseTextSearch(search: string): boolean {
    const trimmed = search.trim()
    if (trimmed.length <= 2) return false // 太短
    if (/^\d+$/.test(trimmed)) return false // 纯数字（商品ID）
    if (/^[A-Za-z0-9-]+$/i.test(trimmed) && trimmed.length <= 10) return false // 可能是型番
    return true
}

/**
 * 分页查询产品
 * 支持混合搜索：常规关键词用全文索引，ID/型番等用正则匹配
 * @param query 查询参数
 */
export async function queryProducts(query: ProductQuery): Promise<ProductResult> {
    try {
        const collection = getProductsCollection()

        // 构建查询条件
        const filter: Record<string, any> = {}
        let useTextSearch = false

        if (query.search) {
            const search = query.search.trim()

            if (shouldUseTextSearch(search)) {
                // 使用全文搜索（性能更好，支持相关性排序）
                filter.$text = {$search: search}
                useTextSearch = true
            } else {
                // 使用正则匹配（适合ID、型番等精确匹配场景）
                const regex = new RegExp(search, 'i')
                filter.$or = [
                    {title: regex},
                    {product_id: regex},
                    {'attributes.管理番号': regex},
                    {'attributes.型番': regex},
                ]
            }
        }

        if (query.manufacturer) {
            filter['attributes.メーカー'] = query.manufacturer
        }

        if (query.minPrice !== undefined || query.maxPrice !== undefined) {
            // 解析价格字符串为数字
            filter.$or = [
                {'attributes.定価': {$gte: query.minPrice ?? 0, $lte: query.maxPrice ?? 999999}},
            ]
        }

        // 获取总数
        const total = await collection.countDocuments(filter)

        // 计算分页
        const page = query.page || 1
        const limit = query.limit || 20
        const skip = (page - 1) * limit
        const totalPages = Math.ceil(total / limit)

        // 构建查询
        let findQuery = collection.find(filter)

        // 全文搜索时添加相关性分数并排序
        if (useTextSearch) {
            findQuery = findQuery.project({
                score: {$meta: 'textScore'},
            })
            findQuery = findQuery.sort({
                score: {$meta: 'textScore'},
                product_id: -1,
            })
        } else {
            findQuery = findQuery.sort({product_id: -1})
        }

        // 查询数据
        const products = await findQuery.skip(skip).limit(limit).toArray()

        return {
            products,
            total,
            page,
            limit,
            totalPages,
        }
    } catch (error) {
        console.error('[mongodb] queryProducts error:', error)
        return {
            products: [],
            total: 0,
            page: 1,
            limit: query.limit || 20,
            totalPages: 0,
        }
    }
}

/**
 * 获取产品统计信息
 */
export async function getProductStats() {
    try {
        const collection = getProductsCollection()

        const total = await collection.countDocuments()

        // 获取制作商统计
        const manufacturers = await collection
            .aggregate([
                {$group: {_id: '$attributes.メーカー', count: {$sum: 1}}},
                {$sort: {count: -1}},
                {$limit: 20},
            ])
            .toArray()

        // 获取类型统计（通过型番前缀判断）
        const modelTypes = await collection
            .aggregate([
                {$group: {_id: {$substr: ['$attributes.型番', 0, 2]}, count: {$sum: 1}}},
                {$sort: {count: -1}},
                {$limit: 20},
            ])
            .toArray()

        return {
            total,
            manufacturers,
            modelTypes,
        }
    } catch (error) {
        console.error('[mongodb] getProductStats error:', error)
        return {
            total: 0,
            manufacturers: [],
            modelTypes: [],
        }
    }
}

/**
 * 批量插入或更新产品
 * @param products 产品数组
 */
export async function upsertProducts(products: MongoProduct[]): Promise<void> {
    try {
        const collection = getProductsCollection()

        const operations = products.map(product => ({
            updateOne: {
                filter: {product_id: product.product_id},
                update: {
                    $set: product,
                    $setOnInsert: {
                        created_at: Math.floor(Date.now() / 1000),
                    },
                },
                upsert: true,
            },
        }))

        if (operations.length > 0) {
            await collection.bulkWrite(operations, {ordered: false})
        }
    } catch (error) {
        console.error('[mongodb] upsertProducts error:', error)
        throw error
    }
}

/**
 * 清空产品集合
 */
export async function clearProducts(): Promise<void> {
    try {
        const collection = getProductsCollection()
        await collection.deleteMany({})
    } catch (error) {
        console.error('[mongodb] clearProducts error:', error)
        throw error
    }
}

/**
 * 导入单个产品（如果不存在则插入，存在则更新）
 * @param product 产品数据
 */
export async function importProduct(product: MongoProduct): Promise<void> {
    try {
        const collection = getProductsCollection()
        await collection.updateOne(
            {product_id: product.product_id},
            {
                $set: {
                    ...product,
                    updated_at: Math.floor(Date.now() / 1000),
                },
            },
            {upsert: true}
        )
    } catch (error) {
        console.error('[mongodb] importProduct error:', error)
        throw error
    }
}

/**
 * 批量导入产品（带进度提示）
 * @param products 产品数组
 * @param onProgress 进度回调
 */
export async function importProductsBatch(
    products: MongoProduct[],
    onProgress?: (processed: number, total: number) => void
): Promise<void> {
    try {
        const collection = getProductsCollection()
        const total = products.length
        let processed = 0

        for (const product of products) {
            await collection.updateOne(
                {product_id: product.product_id},
                {
                    $set: {
                        ...product,
                        updated_at: Math.floor(Date.now() / 1000),
                    },
                },
                {upsert: true}
            )
            processed++
            onProgress?.(processed, total)
        }
    } catch (error) {
        console.error('[mongodb] importProductsBatch error:', error)
        throw error
    }
}
