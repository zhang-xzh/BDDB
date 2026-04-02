#ifndef PRODUCTSYNC_H
#define PRODUCTSYNC_H

#include "search/productsearch.h"
#include "models/models.h"
#include <vector>
#include <string>
#include <optional>
#include <functional>

// 同步结果
struct SyncResult {
    int total = 0;
    int indexed = 0;
    int failed = 0;

    bool operator==(const SyncResult&) const = default;
};

// 同步进度回调
using SyncProgressCallback = std::function<void(int processed, int total)>;

// 详细同步信息
struct SyncDetail {
    std::string volumeId;
    std::string catalogNo;
    std::vector<std::string> productIds;
    std::vector<std::string> newIds;
    int count = 0;
};

// 卷-产品关联结果
struct LinkVolumesResult {
    int updated = 0;
    int matched = 0;
    int skipped = 0;
    std::vector<SyncDetail> details;
};

// 产品同步服务
class ProductSyncService {
public:
    // 将 MongoDB 产品转换为搜索文档
    static ProductSearchDoc convertToSearchDoc(const Product &product);

    // 全量同步所有产品
    // 从 MongoDB 读取所有产品并索引到 Meilisearch
    static SearchResult<SyncResult> syncAllProducts(
        std::optional<SyncProgressCallback> onProgress = std::nullopt,
        int batchSize = 1000
    );

    // 增量同步（按 product_id 列表）
    static SearchResult<void> syncProductsByIds(
        const std::vector<std::string> &productIds
    );

    // 同步单个产品
    static SearchResult<void> syncSingleProduct(const std::string &productId);

    // 重建索引（删除并重新创建，然后全量同步）
    static SearchResult<SyncResult> rebuildIndex(
        std::optional<SyncProgressCallback> onProgress = std::nullopt
    );

private:
    // 辅助函数：处理一批产品
    static SearchResult<int> processBatch(
        const std::vector<Product> &products,
        int &processed,
        int total,
        std::optional<SyncProgressCallback> onProgress
    );
};

#endif // PRODUCTSYNC_H
