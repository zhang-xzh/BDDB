// Meilisearch 模块统一导出
export {
    getMeiliClient,
    ensureMeiliConnected,
    setupProductsIndex,
    deleteProductsIndex,
    PRODUCTS_INDEX,
} from './client'

export {
    indexProduct,
    bulkIndexProducts,
    searchProducts,
    deleteProductIndex,
    clearAllProducts,
    getIndexStats,
    type ProductSearchDoc,
    type ProductSearchResult,
} from './productSearch'

export {
    syncAllProducts,
    syncProductsByIds,
    rebuildIndex,
    syncSingleProduct,
} from './syncProducts'

// Bangumi 搜索模块
export {
    BANGUMI_INDEX,
    setupBangumiIndex,
    deleteBangumiIndex,
    indexBangumiSubject,
    bulkIndexBangumiSubjects,
    deleteBangumiSubject,
    clearAllBangumiSubjects,
    searchBangumi,
    getBangumiIndexStats,
    getBangumiTypeStats,
    type BangumiSearchDoc,
    type BangumiSearchResult,
    type BangumiSearchOptions,
} from './bangumiSearch'
