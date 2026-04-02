#ifndef PRODUCTSEARCH_H
#define PRODUCTSEARCH_H

#include "search/meilisearchclient.h"
#include "models/models.h"
#include <QList>
#include <QString>
#include <optional>
#include <functional>

// 产品搜索文档（用于索引和搜索结果）
struct ProductSearchDoc {
    QString productId;
    QString title;
    std::optional<QString> manufacturer;
    QList<QString> voiceActors;
    QList<QString> artists;
    std::optional<QString> scenario;
    std::optional<QString> modelNumber;
    std::optional<QString> releaseDate;
    std::optional<QString> price;
    std::optional<QString> url;
    QList<QString> images;
    std::optional<QString> noteRaw;
    
    // 可选的高亮字段
    std::optional<QString> highlightTitle;

    // 转换为 JSON 用于索引
    [[nodiscard]] QString toJson() const;
    
    // 从 Product 模型转换
    static ProductSearchDoc fromProduct(const Product& product);
};

// 产品搜索结果
struct ProductSearchResult {
    QList<ProductSearchDoc> products;
    qint32 total = 0;
    qint32 page = 1;
    qint32 totalPages = 0;
};

// 搜索选项
struct ProductSearchOptions {
    qint32 page = 1;
    qint32 limit = 20;
    std::optional<QString> filter;
    bool enableHighlight = true;
};

// 产品搜索服务
class ProductSearchService {
public:
    static constexpr const char* kIndexName = "products";

    // 初始化索引（创建或更新设置）
    static SearchResult<void> setupIndex();
    
    // 删除索引
    static SearchResult<void> deleteIndex();
    
    // 索引单个产品
    static SearchResult<void> indexProduct(const ProductSearchDoc& product);
    
    // 批量索引产品
    static SearchResult<void> bulkIndexProducts(
        const QList<ProductSearchDoc>& products,
        std::optional<std::function<void(qint32 processed, qint32 total)>> onProgress = std::nullopt
    );
    
    // 搜索产品
    static SearchResult<ProductSearchResult> searchProducts(
        const QString& query,
        const ProductSearchOptions& options = {}
    );
    
    // 删除产品索引
    static SearchResult<void> deleteProductIndex(const QString& productId);
    
    // 清空所有产品
    static SearchResult<void> clearAllProducts();
    
    // 获取索引统计
    static SearchResult<IndexStats> getIndexStats();

private:
    // 更新索引设置
    static SearchResult<void> updateIndexSettings();
};

#endif // PRODUCTSEARCH_H
