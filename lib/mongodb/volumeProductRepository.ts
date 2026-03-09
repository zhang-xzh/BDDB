import {getMongoCollection, getSurugaYaCollection} from './connection'
import type {Collection} from 'mongodb'
import type {BddbVolume} from './bddbRepository'
import type {MongoProduct} from './productRepository'
import type {MongoProductRawPage, MongoProductRawAsset} from './productsRawRepository'

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

/**
 * Volume 与 MongoProduct 关联结果
 */
export interface VolumeProductRelation {
    volume: BddbVolume
    product: MongoProduct | null
}

/**
 * Volume 与完整离线网页关联结果（包含 page 和全部 assets）
 */
export interface VolumeProductRawRelation {
    volume: BddbVolume
    product: MongoProduct | null
    rawPage: MongoProductRawPage | null
    assets: MongoProductRawAsset[]           // 全部资源文件
    assetMap: Map<string, MongoProductRawAsset>  // 资源路径 → 资源
}

/**
 * 批量关联查询结果
 */
export interface VolumeProductBatchResult {
    relations: VolumeProductRelation[]
    matchedCount: number
    unmatchedVolumes: BddbVolume[]
}

/**
 * 批量关联查询结果（包含完整离线网页）
 */
export interface VolumeProductRawBatchResult {
    relations: VolumeProductRawRelation[]
    matchedCount: number
    unmatchedVolumes: BddbVolume[]
}

// ─── 集合获取 ─────────────────────────────────────────────────────────────────

function getVolumesCollection(): Collection<BddbVolume> {
    return getMongoCollection<BddbVolume>('bddb_volumes')
}

function getProductsCollection(): Collection<MongoProduct> {
    return getSurugaYaCollection<MongoProduct>('products')
}

function getProductsRawCollection<T extends MongoProductRawPage | MongoProductRawAsset = MongoProductRawPage | MongoProductRawAsset>(): Collection<T> {
    return getSurugaYaCollection<T>('products_raw')
}

// ─── Asset 查询 ───────────────────────────────────────────────────────────────

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

// ─── Volume → MongoProduct 查询 ────────────────────────────────────────────────

/**
 * 根据 Volume 查询关联的 MongoProduct
 * 关联条件: Volume.catalog_no = Product.attributes.型番
 * @param volume Volume 对象
 * @returns 关联的 MongoProduct，未找到返回 null
 */
export async function getProductByVolume(volume: BddbVolume): Promise<MongoProduct | null> {
    try {
        if (!volume.catalog_no) {
            return null
        }
        const collection = getProductsCollection()
        const product = await collection.findOne({
            'attributes.型番': volume.catalog_no,
        })
        return product || null
    } catch (error) {
        console.error('[mongodb] getProductByVolume error:', error)
        return null
    }
}

/**
 * 根据 Volume ID 查询关联的 MongoProduct
 * @param volumeId Volume 的 _id
 * @returns 关联的 MongoProduct，未找到返回 null
 */
export async function getProductByVolumeId(volumeId: string): Promise<MongoProduct | null> {
    try {
        const volumesCollection = getVolumesCollection()
        const volume = await volumesCollection.findOne({_id: volumeId as any})
        if (!volume || !volume.catalog_no) {
            return null
        }
        return getProductByVolume(volume)
    } catch (error) {
        console.error('[mongodb] getProductByVolumeId error:', error)
        return null
    }
}

/**
 * 根据 catalog_no 查询关联的 MongoProduct
 * @param catalogNo 型番 (catalog_no)
 * @returns 关联的 MongoProduct，未找到返回 null
 */
export async function getProductByCatalogNo(catalogNo: string): Promise<MongoProduct | null> {
    try {
        const collection = getProductsCollection()
        const product = await collection.findOne({
            'attributes.型番': catalogNo,
        })
        return product || null
    } catch (error) {
        console.error('[mongodb] getProductByCatalogNo error:', error)
        return null
    }
}

/**
 * 批量根据 catalog_no 列表查询关联的 MongoProduct
 * @param catalogNos 型番数组
 * @returns Map<catalog_no, MongoProduct>
 */
export async function getProductsByCatalogNos(catalogNos: string[]): Promise<Map<string, MongoProduct>> {
    try {
        const collection = getProductsCollection()
        const products = await collection
            .find({'attributes.型番': {$in: catalogNos}})
            .toArray()

        const map = new Map<string, MongoProduct>()
        for (const product of products) {
            const modelNumber = product.attributes?.型番
            if (modelNumber) {
                map.set(modelNumber, product)
            }
        }
        return map
    } catch (error) {
        console.error('[mongodb] getProductsByCatalogNos error:', error)
        return new Map()
    }
}

/**
 * 批量关联 Volume 列表与 MongoProduct
 * @param volumes Volume 数组
 * @returns 关联结果
 */
export async function getVolumeProductRelations(volumes: BddbVolume[]): Promise<VolumeProductBatchResult> {
    try {
        const catalogNos = volumes
            .map(v => v.catalog_no)
            .filter((cn): cn is string => Boolean(cn))

        const productMap = await getProductsByCatalogNos(catalogNos)

        const relations: VolumeProductRelation[] = []
        const unmatchedVolumes: BddbVolume[] = []

        for (const volume of volumes) {
            const product = volume.catalog_no ? productMap.get(volume.catalog_no) || null : null
            relations.push({volume, product})
            if (!product) {
                unmatchedVolumes.push(volume)
            }
        }

        return {
            relations,
            matchedCount: relations.length - unmatchedVolumes.length,
            unmatchedVolumes,
        }
    } catch (error) {
        console.error('[mongodb] getVolumeProductRelations error:', error)
        return {
            relations: volumes.map(v => ({volume: v, product: null})),
            matchedCount: 0,
            unmatchedVolumes: volumes,
        }
    }
}

// ─── Volume → 完整离线网页查询（包含 page 和全部 assets）────────────────────────

/**
 * 根据 MongoProduct 查询关联的 MongoProductRawPage
 * 关联条件: Product.attributes.管理番号 = RawPage._id
 * @param product MongoProduct 对象
 * @returns 关联的 MongoProductRawPage，未找到返回 null
 */
export async function getProductRawPageByProduct(product: MongoProduct): Promise<MongoProductRawPage | null> {
    try {
        const manageCode = product.attributes?.管理番号
        if (!manageCode) {
            return null
        }
        const collection = getProductsRawCollection<MongoProductRawPage>()
        const rawPage = await collection.findOne({
            _id: manageCode,
            type: 'page',
        })
        return rawPage || null
    } catch (error) {
        console.error('[mongodb] getProductRawPageByProduct error:', error)
        return null
    }
}

/**
 * 根据 Volume 查询关联的完整离线网页（包含 page 和全部 assets）
 * 关联链路: Volume.catalog_no → Product.attributes.型番 → Product.attributes.管理番号 → RawPage._id
 * @param volume Volume 对象
 * @returns 关联结果包含 product、rawPage 和全部 assets
 */
export async function getProductRawPageByVolume(volume: BddbVolume): Promise<VolumeProductRawRelation> {
    try {
        const [product, assets, assetMap] = await Promise.all([
            getProductByVolume(volume),
            getAllRawAssets(),
            getAllRawAssetsMap(),
        ])

        if (!product) {
            return {volume, product: null, rawPage: null, assets, assetMap}
        }

        const rawPage = await getProductRawPageByProduct(product)
        return {volume, product, rawPage, assets, assetMap}
    } catch (error) {
        console.error('[mongodb] getProductRawPageByVolume error:', error)
        return {volume, product: null, rawPage: null, assets: [], assetMap: new Map()}
    }
}

/**
 * 根据 Volume ID 查询关联的完整离线网页（包含 page 和全部 assets）
 * @param volumeId Volume 的 _id
 * @returns 关联结果包含 product、rawPage 和全部 assets
 */
export async function getProductRawPageByVolumeId(volumeId: string): Promise<VolumeProductRawRelation | null> {
    try {
        const volumesCollection = getVolumesCollection()
        const volume = await volumesCollection.findOne({_id: volumeId as any})
        if (!volume) {
            return null
        }
        return getProductRawPageByVolume(volume)
    } catch (error) {
        console.error('[mongodb] getProductRawPageByVolumeId error:', error)
        return null
    }
}

/**
 * 根据管理番号查询 MongoProductRawPage
 * @param manageCode 管理番号
 * @returns 关联的 MongoProductRawPage，未找到返回 null
 */
export async function getProductRawPageByManageCode(manageCode: string): Promise<MongoProductRawPage | null> {
    try {
        const collection = getProductsRawCollection<MongoProductRawPage>()
        const rawPage = await collection.findOne({
            _id: manageCode,
            type: 'page',
        })
        return rawPage || null
    } catch (error) {
        console.error('[mongodb] getProductRawPageByManageCode error:', error)
        return null
    }
}

/**
 * 批量根据管理番号列表查询 MongoProductRawPage
 * @param manageCodes 管理番号数组
 * @returns Map<管理番号, MongoProductRawPage>
 */
export async function getProductRawPagesByManageCodes(manageCodes: string[]): Promise<Map<string, MongoProductRawPage>> {
    try {
        const collection = getProductsRawCollection<MongoProductRawPage>()
        const rawPages = await collection
            .find({_id: {$in: manageCodes}, type: 'page'})
            .toArray()

        const map = new Map<string, MongoProductRawPage>()
        for (const rawPage of rawPages) {
            map.set(rawPage._id, rawPage)
        }
        return map
    } catch (error) {
        console.error('[mongodb] getProductRawPagesByManageCodes error:', error)
        return new Map()
    }
}

/**
 * 批量关联 Volume 列表与完整离线网页（包含 page 和全部 assets）
 * @param volumes Volume 数组
 * @returns 关联结果
 */
export async function getVolumeProductRawRelations(volumes: BddbVolume[]): Promise<VolumeProductRawBatchResult> {
    try {
        // 并行获取：Products 和全部 Assets
        const catalogNos = volumes
            .map(v => v.catalog_no)
            .filter((cn): cn is string => Boolean(cn))

        const [productMap, assets, assetMap] = await Promise.all([
            getProductsByCatalogNos(catalogNos),
            getAllRawAssets(),
            getAllRawAssetsMap(),
        ])

        // 收集管理番号
        const manageCodes: string[] = []
        const volumeToManageCode = new Map<string, string>()

        for (const volume of volumes) {
            const product = volume.catalog_no ? productMap.get(volume.catalog_no) : null
            const manageCode = product?.attributes?.管理番号
            if (manageCode) {
                manageCodes.push(manageCode)
                volumeToManageCode.set(volume._id.toString(), manageCode)
            }
        }

        // 批量获取 RawPages
        const rawPageMap = await getProductRawPagesByManageCodes(manageCodes)

        // 组装结果
        const relations: VolumeProductRawRelation[] = []
        const unmatchedVolumes: BddbVolume[] = []

        for (const volume of volumes) {
            const product = volume.catalog_no ? productMap.get(volume.catalog_no) || null : null
            const manageCode = volumeToManageCode.get(volume._id.toString())
            const rawPage = manageCode ? rawPageMap.get(manageCode) || null : null

            relations.push({volume, product, rawPage, assets, assetMap})
            if (!product || !rawPage) {
                unmatchedVolumes.push(volume)
            }
        }

        return {
            relations,
            matchedCount: relations.length - unmatchedVolumes.length,
            unmatchedVolumes,
        }
    } catch (error) {
        console.error('[mongodb] getVolumeProductRawRelations error:', error)
        return {
            relations: volumes.map(v => ({
                volume: v,
                product: null,
                rawPage: null,
                assets: [],
                assetMap: new Map(),
            })),
            matchedCount: 0,
            unmatchedVolumes: volumes,
        }
    }
}

// ─── 聚合查询接口 ─────────────────────────────────────────────────────────────

/**
 * 根据 torrent_id 获取 Volume 及其关联的 Product 信息
 * @param torrentId 种子 ID
 * @returns VolumeProductRelation 数组
 */
export async function getVolumeProductRelationsByTorrentId(torrentId: string): Promise<VolumeProductRelation[]> {
    try {
        const volumesCollection = getVolumesCollection()
        const volumes = await volumesCollection
            .find({torrent_id: torrentId as any, is_deleted: false})
            .sort({volume_no: 1})
            .toArray()

        if (volumes.length === 0) {
            return []
        }

        const result = await getVolumeProductRelations(volumes)
        return result.relations
    } catch (error) {
        console.error('[mongodb] getVolumeProductRelationsByTorrentId error:', error)
        return []
    }
}

/**
 * 根据 torrent_id 获取 Volume 及其关联的完整离线网页（包含 page 和全部 assets）
 * @param torrentId 种子 ID
 * @returns VolumeProductRawRelation 数组
 */
export async function getVolumeProductRawRelationsByTorrentId(torrentId: string): Promise<VolumeProductRawRelation[]> {
    try {
        const volumesCollection = getVolumesCollection()
        const volumes = await volumesCollection
            .find({torrent_id: torrentId as any, is_deleted: false})
            .sort({volume_no: 1})
            .toArray()

        if (volumes.length === 0) {
            return []
        }

        const result = await getVolumeProductRawRelations(volumes)
        return result.relations
    } catch (error) {
        console.error('[mongodb] getVolumeProductRawRelationsByTorrentId error:', error)
        return []
    }
}

/**
 * 根据 catalog_no 查询完整的关联链（包含 page 和全部 assets）
 * @param catalogNo 型番
 * @returns 完整的关联信息
 */
export async function getFullRelationByCatalogNo(catalogNo: string): Promise<{
    product: MongoProduct | null
    rawPage: MongoProductRawPage | null
    assets: MongoProductRawAsset[]
    assetMap: Map<string, MongoProductRawAsset>
    volumes: BddbVolume[]
}> {
    try {
        const [product, assets, assetMap] = await Promise.all([
            getProductByCatalogNo(catalogNo),
            getAllRawAssets(),
            getAllRawAssetsMap(),
        ])

        const rawPage = product ? await getProductRawPageByProduct(product) : null

        const volumesCollection = getVolumesCollection()
        const volumes = await volumesCollection
            .find({catalog_no: catalogNo, is_deleted: false})
            .sort({volume_no: 1})
            .toArray()

        return {product, rawPage, assets, assetMap, volumes}
    } catch (error) {
        console.error('[mongodb] getFullRelationByCatalogNo error:', error)
        return {product: null, rawPage: null, assets: [], assetMap: new Map(), volumes: []}
    }
}
