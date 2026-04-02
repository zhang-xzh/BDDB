#ifndef BANGUMISEARCH_H
#define BANGUMISEARCH_H

#include "search/meilisearchclient.h"
#include <QList>
#include <QString>
#include <QMap>
#include <optional>
#include <functional>

// Bangumi 搜索文档类型
struct BangumiSearchDoc {
    qint32 subjectId = 0;           // 条目 ID
    QString name;                // 原名
    QString nameCn;              // 中文名
    qint32 type = 0;                // 条目类型 ID
    QString typeName;            // 条目类型名称
    std::optional<qint32> platform; // 平台 ID
    std::optional<QString> platformName; // 平台名称
    QString summary;             // 简介
    std::optional<QString> date; // 放送/发售日期
    std::optional<qreal> score; // 评分
    std::optional<qint32> rank;     // 排名
    QString url;                 // 条目页面 URL
    QList<QString> tags;         // 标签
    bool nsfw = false;           // 是否 NSFW
    
    // 高亮字段
    std::optional<QString> highlightNameCn;
    std::optional<QString> highlightSummary;

    // 转换为 JSON 用于索引
    [[nodiscard]] QString toJson() const;
};

// 搜索结果类型
struct BangumiSearchResult {
    QList<BangumiSearchDoc> subjects;
    qint32 total = 0;
    qint32 page = 1;
    qint32 totalPages = 0;
};

// 过滤选项
struct BangumiSearchOptions {
    qint32 page = 1;
    qint32 limit = 20;
    std::optional<qint32> type;           // 条目类型过滤
    std::optional<qint32> platform;       // 平台过滤
    std::optional<qreal> minScore;    // 最低评分
    std::optional<qreal> maxScore;    // 最高评分
    std::optional<bool> nsfw;          // NSFW 过滤
};

// Bangumi 搜索服务
class BangumiSearchService {
public:
    static constexpr const char* kIndexName = "bangumi_subjects";

    // ============ 索引管理 ============
    
    // 创建 Bangumi 搜索索引
    static SearchResult<void> setupIndex();
    
    // 删除 Bangumi 索引
    static SearchResult<void> deleteIndex();

    // ============ 文档操作 ============
    
    // 索引单个 Bangumi 条目
    static SearchResult<void> indexSubject(const BangumiSearchDoc& subject);
    
    // 批量索引 Bangumi 条目
    static SearchResult<void> bulkIndexSubjects(
        const QList<BangumiSearchDoc>& subjects,
        std::optional<std::function<void(qint32 processed, qint32 total)>> onProgress = std::nullopt
    );
    
    // 删除单个 Bangumi 条目
    static SearchResult<void> deleteSubject(qint32 subjectId);
    
    // 清空所有 Bangumi 条目
    static SearchResult<void> clearAllSubjects();

    // ============ 搜索 ============
    
    // 搜索 Bangumi 条目
    static SearchResult<BangumiSearchResult> search(
        const QString& query,
        const BangumiSearchOptions& options = {}
    );
    
    // 获取 Bangumi 索引统计
    static SearchResult<IndexStats> getIndexStats();
    
    // 获取类型分布统计
    static SearchResult<QMap<qint32, qint32>> getTypeStats();

private:
    // 更新索引设置
    static SearchResult<void> updateIndexSettings();
};

#endif // BANGUMISEARCH_H
