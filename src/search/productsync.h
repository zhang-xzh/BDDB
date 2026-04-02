#ifndef PRODUCTSYNC_H
#define PRODUCTSYNC_H

#include "search/productsearch.h"
#include "models/models.h"
#include <QList>
#include <QString>
#include <optional>
#include <functional>

// 同步结果
struct SyncResult {
    qint32 total = 0;
    qint32 indexed = 0;
    qint32 failed = 0;

    bool operator==(const SyncResult&) const = default;
};

// 同步进度回调
using SyncProgressCallback = std::function<void(qint32 processed, qint32 total)>;

// 详细同步信息
struct SyncDetail {
    QString volumeId;
    QString catalogNo;
    QList<QString> productIds;
    QList<QString> newIds;
    qint32 count = 0;
};

// 卷-产品关联结果
struct LinkVolumesResult {
    qint32 updated = 0;
    qint32 matched = 0;
    qint32 skipped = 0;
    QList<SyncDetail> details;
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
        qint32 batchSize = 1000
    );

    // 增量同步（按 product_id 列表）
    static SearchResult<void> syncProductsByIds(
        const QList<QString> &productIds
    );

    // 同步单个产品
    static SearchResult<void> syncSingleProduct(const QString &productId);

    // 重建索引（删除并重新创建，然后全量同步）
    static SearchResult<SyncResult> rebuildIndex(
        std::optional<SyncProgressCallback> onProgress = std::nullopt
    );

private:
    // 辅助函数：处理一批产品
    static SearchResult<qint32> processBatch(
        const QList<Product> &products,
        qint32 &processed,
        qint32 total,
        std::optional<SyncProgressCallback> onProgress
    );
};

#endif // PRODUCTSYNC_H
