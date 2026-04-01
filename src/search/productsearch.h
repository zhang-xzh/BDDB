#ifndef PRODUCTSEARCH_H
#define PRODUCTSEARCH_H

#include "search/meilisearchclient.h"
#include "models/models.h"
#include <vector>
#include <string>
#include <optional>

// 产品搜索文档（用于索引和搜索结果）
struct ProductSearchDoc {
    std::string productId;
    std::string title;
    std::optional<std::string> manufacturer;
    std::vector<std::string> voiceActors;
    std::vector<std::string> artists;
    std::optional<std::string> scenario;
    std::optional<std::string> modelNumber;
    std::optional<std::string> releaseDate;
    std::optional<std::string> price;
    std::optional<std::string> url;
    std::vector<std::string> images;
    std::optional<std::string> noteRaw;
    
    // 可选的高亮字段
    std::optional<std::string> highlightTitle;

    // 转换为 JSON 用于索引
    [[nodiscard]] std::string toJson() const;
    
    // 从 Product 模型转换
    static ProductSearchDoc fromProduct(const Product& product);
};

// 产品搜索结果
struct ProductSearchResult {
    std::vector<ProductSearchDoc> products;
    int total = 0;
    int page = 1;
    int totalPages = 0;
};

// 搜索选项
struct ProductSearchOptions {
    int page = 1;
    int limit = 20;
    std::optional<std::string> filter;
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
        const std::vector<ProductSearchDoc>& products,
        std::optional<std::function<void(int processed, int total)>> onProgress = std::nullopt
    );
    
    // 搜索产品
    static SearchResult<ProductSearchResult> searchProducts(
        const std::string& query,
        const ProductSearchOptions& options = {}
    );
    
    // 删除产品索引
    static SearchResult<void> deleteProductIndex(const std::string& productId);
    
    // 清空所有产品
    static SearchResult<void> clearAllProducts();
    
    // 获取索引统计
    static SearchResult<IndexStats> getIndexStats();

private:
    // 更新索引设置
    static SearchResult<void> updateIndexSettings();
};

#endif // PRODUCTSEARCH_H
