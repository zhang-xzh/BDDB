#ifndef MEILISEARCHCLIENT_H
#define MEILISEARCHCLIENT_H

#include <QString>
#include <QList>
#include <memory>
#include <expected>

template<typename T> using SearchResult = std::expected<T, QString>;

// Meilisearch 客户端配置
struct MeiliConfig {
    QString host = QStringLiteral("http://localhost:17700");
    QString apiKey;
};

// 索引统计信息
struct IndexStats {
    qint32 totalDocuments = 0;
    bool isIndexing = false;
};

// 搜索响应基类
template<typename T>
struct SearchResponse {
    QList<T> hits;
    qint32 total = 0;
    qint32 page = 1;
    qint32 pageSize = 20;
    qint32 totalPages = 0;
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
    SearchResult<void> createIndex(const QString& indexName, const QString& primaryKey);
    SearchResult<void> deleteIndex(const QString& indexName);
    SearchResult<bool> indexExists(const QString& indexName) const;
    SearchResult<IndexStats> getIndexStats(const QString& indexName) const;

    // 文档操作
    SearchResult<void> addDocuments(const QString& indexName, const QString& jsonDocuments);
    SearchResult<void> deleteDocument(const QString& indexName, const QString& documentId);
    SearchResult<void> deleteAllDocuments(const QString& indexName);

    // 搜索
    SearchResult<QString> searchRaw(
        const QString& indexName,
        const QString& query,
        qint32 offset = 0,
        qint32 limit = 20,
        const QList<QString>& filter = {},
        const QList<QString>& sort = {}
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
