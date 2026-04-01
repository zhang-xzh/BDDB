#ifndef MEILISEARCHCLIENT_H
#define MEILISEARCHCLIENT_H

#include <string>
#include <memory>
#include <expected>

template<typename T> using SearchResult = std::expected<T, std::string>;

// Meilisearch 客户端配置
struct MeiliConfig {
    std::string host = "http://localhost:17700";
    std::string apiKey;
};

// 索引统计信息
struct IndexStats {
    int totalDocuments = 0;
    bool isIndexing = false;
};

// 搜索响应基类
template<typename T>
struct SearchResponse {
    std::vector<T> hits;
    int total = 0;
    int page = 1;
    int pageSize = 20;
    int totalPages = 0;
};

// Meilisearch 客户端
class MeiliSearchClient {
public:
    static MeiliSearchClient& instance();

    // 连接管理
    bool connect(const MeiliConfig& config = {});
    bool isConnected() const;
    SearchResult<void> health() const;

    // 索引管理
    SearchResult<void> createIndex(const std::string& indexName, const std::string& primaryKey);
    SearchResult<void> deleteIndex(const std::string& indexName);
    SearchResult<bool> indexExists(const std::string& indexName) const;
    SearchResult<IndexStats> getIndexStats(const std::string& indexName) const;

    // 文档操作
    SearchResult<void> addDocuments(const std::string& indexName, const std::string& jsonDocuments);
    SearchResult<void> deleteDocument(const std::string& indexName, const std::string& documentId);
    SearchResult<void> deleteAllDocuments(const std::string& indexName);

    // 搜索
    SearchResult<std::string> searchRaw(
        const std::string& indexName,
        const std::string& query,
        int offset = 0,
        int limit = 20,
        const std::vector<std::string>& filter = {},
        const std::vector<std::string>& sort = {}
    ) const;

private:
    MeiliSearchClient() = default;
    ~MeiliSearchClient() = default;
    MeiliSearchClient(const MeiliSearchClient&) = delete;
    MeiliSearchClient& operator=(const MeiliSearchClient&) = delete;

    class Impl;
    std::unique_ptr<Impl> m_impl;
};

#endif // MEILISEARCHCLIENT_H
