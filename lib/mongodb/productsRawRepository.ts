import {getSurugaYaCollection} from './connection'
import type {Collection} from 'mongodb'

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

export interface MongoProductRawBase {
    _id: string; // 商品编号（page）或资源路径（asset）
    type: 'page' | 'asset';
}

export interface MongoProductRawPage extends MongoProductRawBase {
    type: 'page';
    html: string; // 压缩后的 HTML 字符串
}

export interface MongoProductRawAsset extends MongoProductRawBase {
    type: 'asset';
    mime: string; // MIME 类型
    data: Buffer; // 原始文件二进制（BSON Binary → Buffer）
}

export type MongoProductRaw = MongoProductRawPage | MongoProductRawAsset;

// 查询结果类型
export interface RawPageQueryResult {
    items: MongoProductRawPage[]
    total: number
    page: number
    limit: number
    totalPages: number
}

// ─── 集合获取 ─────────────────────────────────────────────────────────────────

function getProductsRawCollection<T extends MongoProductRaw = MongoProductRaw>(): Collection<T> {
    return getSurugaYaCollection<T>('products_raw')
}

// ─── 基础查询 ─────────────────────────────────────────────────────────────────

/**
 * 根据 ID 获取 RawPage
 * @param id 商品编号（管理番号）
 * @returns MongoProductRawPage 或 null
 */
export async function getRawPageById(id: string): Promise<MongoProductRawPage | null> {
    try {
        const collection = getProductsRawCollection<MongoProductRawPage>()
        const page = await collection.findOne({_id: id, type: 'page'})
        return page || null
    } catch (error) {
        console.error('[mongodb] getRawPageById error:', error)
        return null
    }
}

/**
 * 根据 ID 获取 RawAsset
 * @param id 资源路径
 * @returns MongoProductRawAsset 或 null
 */
export async function getRawAssetById(id: string): Promise<MongoProductRawAsset | null> {
    try {
        const collection = getProductsRawCollection<MongoProductRawAsset>()
        const asset = await collection.findOne({_id: id, type: 'asset'})
        return asset || null
    } catch (error) {
        console.error('[mongodb] getRawAssetById error:', error)
        return null
    }
}

/**
 * 根据 ID 列表批量获取 RawPage
 * @param ids 商品编号数组
 * @returns Map<id, MongoProductRawPage>
 */
export async function getRawPagesByIds(ids: string[]): Promise<Map<string, MongoProductRawPage>> {
    try {
        const collection = getProductsRawCollection<MongoProductRawPage>()
        const pages = await collection
            .find({_id: {$in: ids}, type: 'page'})
            .toArray()

        const map = new Map<string, MongoProductRawPage>()
        for (const page of pages) {
            map.set(page._id, page)
        }
        return map
    } catch (error) {
        console.error('[mongodb] getRawPagesByIds error:', error)
        return new Map()
    }
}

/**
 * 根据 ID 列表批量获取 RawAsset
 * @param ids 资源路径数组
 * @returns Map<id, MongoProductRawAsset>
 */
export async function getRawAssetsByIds(ids: string[]): Promise<Map<string, MongoProductRawAsset>> {
    try {
        const collection = getProductsRawCollection<MongoProductRawAsset>()
        const assets = await collection
            .find({_id: {$in: ids}, type: 'asset'})
            .toArray()

        const map = new Map<string, MongoProductRawAsset>()
        for (const asset of assets) {
            map.set(asset._id, asset)
        }
        return map
    } catch (error) {
        console.error('[mongodb] getRawAssetsByIds error:', error)
        return new Map()
    }
}

/**
 * 获取所有 RawPage（分页）
 * @param page 页码（从1开始）
 * @param limit 每页数量
 * @returns 分页结果
 */
export async function getRawPages(page: number = 1, limit: number = 20): Promise<RawPageQueryResult> {
    try {
        const collection = getProductsRawCollection<MongoProductRawPage>()
        const filter = {type: 'page' as const}

        const total = await collection.countDocuments(filter)
        const skip = (page - 1) * limit
        const totalPages = Math.ceil(total / limit)

        const items = await collection
            .find(filter)
            .skip(skip)
            .limit(limit)
            .sort({_id: 1})
            .toArray()

        return {
            items,
            total,
            page,
            limit,
            totalPages,
        }
    } catch (error) {
        console.error('[mongodb] getRawPages error:', error)
        return {
            items: [],
            total: 0,
            page,
            limit,
            totalPages: 0,
        }
    }
}

/**
 * 获取所有 RawAsset（分页）
 * @param page 页码（从1开始）
 * @param limit 每页数量
 * @returns 分页结果
 */
export async function getRawAssets(page: number = 1, limit: number = 20): Promise<{
    items: MongoProductRawAsset[]
    total: number
    page: number
    limit: number
    totalPages: number
}> {
    try {
        const collection = getProductsRawCollection<MongoProductRawAsset>()
        const filter = {type: 'asset' as const}

        const total = await collection.countDocuments(filter)
        const skip = (page - 1) * limit
        const totalPages = Math.ceil(total / limit)

        const items = await collection
            .find(filter)
            .skip(skip)
            .limit(limit)
            .sort({_id: 1})
            .toArray()

        return {
            items,
            total,
            page,
            limit,
            totalPages,
        }
    } catch (error) {
        console.error('[mongodb] getRawAssets error:', error)
        return {
            items: [],
            total: 0,
            page,
            limit,
            totalPages: 0,
        }
    }
}

/**
 * 根据 ID 前缀查询 RawPage（用于模糊搜索商品编号）
 * @param prefix ID 前缀
 * @param limit 返回数量限制
 * @returns MongoProductRawPage 数组
 */
export async function getRawPagesByIdPrefix(prefix: string, limit: number = 20): Promise<MongoProductRawPage[]> {
    try {
        const collection = getProductsRawCollection<MongoProductRawPage>()
        const pages = await collection
            .find({_id: {$regex: `^${prefix}`}, type: 'page'})
            .limit(limit)
            .sort({_id: 1})
            .toArray()
        return pages
    } catch (error) {
        console.error('[mongodb] getRawPagesByIdPrefix error:', error)
        return []
    }
}

/**
 * 检查 RawPage 是否存在
 * @param id 商品编号
 * @returns 是否存在
 */
export async function existsRawPage(id: string): Promise<boolean> {
    try {
        const collection = getProductsRawCollection<MongoProductRawPage>()
        const count = await collection.countDocuments({_id: id, type: 'page'}, {limit: 1})
        return count > 0
    } catch (error) {
        console.error('[mongodb] existsRawPage error:', error)
        return false
    }
}

/**
 * 检查 RawAsset 是否存在
 * @param id 资源路径
 * @returns 是否存在
 */
export async function existsRawAsset(id: string): Promise<boolean> {
    try {
        const collection = getProductsRawCollection<MongoProductRawAsset>()
        const count = await collection.countDocuments({_id: id, type: 'asset'}, {limit: 1})
        return count > 0
    } catch (error) {
        console.error('[mongodb] existsRawAsset error:', error)
        return false
    }
}

/**
 * 获取 RawPage 总数
 * @returns 总数
 */
export async function getRawPageCount(): Promise<number> {
    try {
        const collection = getProductsRawCollection<MongoProductRawPage>()
        return await collection.countDocuments({type: 'page'})
    } catch (error) {
        console.error('[mongodb] getRawPageCount error:', error)
        return 0
    }
}

/**
 * 获取 RawAsset 总数
 * @returns 总数
 */
export async function getRawAssetCount(): Promise<number> {
    try {
        const collection = getProductsRawCollection<MongoProductRawAsset>()
        return await collection.countDocuments({type: 'asset'})
    } catch (error) {
        console.error('[mongodb] getRawAssetCount error:', error)
        return 0
    }
}

/**
 * 获取统计信息
 * @returns 统计数据
 */
export async function getRawStats(): Promise<{
    pageCount: number
    assetCount: number
    totalCount: number
}> {
    try {
        const collection = getProductsRawCollection()
        const [pageCount, assetCount] = await Promise.all([
            collection.countDocuments({type: 'page'}),
            collection.countDocuments({type: 'asset'}),
        ])
        return {
            pageCount,
            assetCount,
            totalCount: pageCount + assetCount,
        }
    } catch (error) {
        console.error('[mongodb] getRawStats error:', error)
        return {
            pageCount: 0,
            assetCount: 0,
            totalCount: 0,
        }
    }
}

// ─── 复合查询（用于离线网页展示）───────────────────────────────────────────────

/**
 * 离线网页展示数据包
 * 包含一个 page 和全部 asset（用于前端路径替换展示）
 */
export interface OfflinePageBundle {
    page: MongoProductRawPage | null
    assets: MongoProductRawAsset[]
    assetMap: Map<string, MongoProductRawAsset>
}

/**
 * 获取离线网页展示数据包
 * 返回指定 page 和全部 assets（用于前端进行资源路径替换）
 * @param pageId 商品编号（page _id）
 * @returns OfflinePageBundle
 */
export async function getOfflinePageBundle(pageId: string): Promise<OfflinePageBundle> {
    try {
        const collection = getProductsRawCollection()

        // 并行获取 page 和全部 assets
        const [page, assets] = await Promise.all([
            collection.findOne<MongoProductRawPage>({_id: pageId, type: 'page'}),
            collection.find<MongoProductRawAsset>({type: 'asset'}).toArray(),
        ])

        const assetMap = new Map<string, MongoProductRawAsset>()
        for (const asset of assets) {
            assetMap.set(asset._id, asset)
        }

        return {
            page: page || null,
            assets,
            assetMap,
        }
    } catch (error) {
        console.error('[mongodb] getOfflinePageBundle error:', error)
        return {
            page: null,
            assets: [],
            assetMap: new Map(),
        }
    }
}

/**
 * 批量获取离线网页展示数据包
 * 用于同时加载多个页面及其资源
 * @param pageIds 商品编号数组
 * @returns Map<pageId, OfflinePageBundle>
 */
export async function getOfflinePageBundles(pageIds: string[]): Promise<Map<string, OfflinePageBundle>> {
    try {
        const collection = getProductsRawCollection()

        // 并行获取所有 pages 和全部 assets
        const [pages, assets] = await Promise.all([
            collection.find<MongoProductRawPage>({_id: {$in: pageIds}, type: 'page'}).toArray(),
            collection.find<MongoProductRawAsset>({type: 'asset'}).toArray(),
        ])

        const assetMap = new Map<string, MongoProductRawAsset>()
        for (const asset of assets) {
            assetMap.set(asset._id, asset)
        }

        const result = new Map<string, OfflinePageBundle>()
        for (const pageId of pageIds) {
            const page = pages.find(p => p._id === pageId) || null
            result.set(pageId, {
                page,
                assets,
                assetMap,
            })
        }

        return result
    } catch (error) {
        console.error('[mongodb] getOfflinePageBundles error:', error)
        const emptyMap = new Map<string, OfflinePageBundle>()
        for (const pageId of pageIds) {
            emptyMap.set(pageId, {
                page: null,
                assets: [],
                assetMap: new Map(),
            })
        }
        return emptyMap
    }
}

/**
 * 获取全部 assets（不分页）
 * 用于离线展示时一次性加载所有资源
 * @returns 所有 asset 数组
 */
export async function getAllRawAssets(): Promise<MongoProductRawAsset[]> {
    try {
        const collection = getProductsRawCollection<MongoProductRawAsset>()
        return await collection.find({type: 'asset'}).toArray()
    } catch (error) {
        console.error('[mongodb] getAllRawAssets error:', error)
        return []
    }
}

/**
 * 获取全部 assets 为 Map 格式
 * @returns Map<assetId, MongoProductRawAsset>
 */
export async function getAllRawAssetsMap(): Promise<Map<string, MongoProductRawAsset>> {
    try {
        const collection = getProductsRawCollection<MongoProductRawAsset>()
        const assets = await collection.find({type: 'asset'}).toArray()

        const map = new Map<string, MongoProductRawAsset>()
        for (const asset of assets) {
            map.set(asset._id, asset)
        }
        return map
    } catch (error) {
        console.error('[mongodb] getAllRawAssetsMap error:', error)
        return new Map()
    }
}
