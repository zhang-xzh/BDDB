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
