#ifndef BANGUMISEARCH_H
#define BANGUMISEARCH_H

#include "search/meilisearchclient.h"
#include <vector>
#include <string>
#include <optional>
#include <map>

// Bangumi 搜索文档类型
struct BangumiSearchDoc {
    int subjectId = 0;           // 条目 ID
    std::string name;            // 原名
    std::string nameCn;          // 中文名
    int type = 0;                // 条目类型 ID
    std::string typeName;        // 条目类型名称
    std::optional<int> platform; // 平台 ID
    std::optional<std::string> platformName; // 平台名称
    std::string summary;         // 简介
    std::optional<std::string> date; // 放送/发售日期
    std::optional<double> score; // 评分
    std::optional<int> rank;     // 排名
    std::string url;             // 条目页面 URL
    std::vector<std::string> tags; // 标签
    bool nsfw = false;           // 是否 NSFW
    
    // 高亮字段
    std::optional<std::string> highlightNameCn;
    std::optional<std::string> highlightSummary;

    // 转换为 JSON 用于索引
    [[nodiscard]] std::string toJson() const;
};

// 搜索结果类型
struct BangumiSearchResult {
    std::vector<BangumiSearchDoc> subjects;
    int total = 0;
    int page = 1;
    int totalPages = 0;
};

// 过滤选项
struct BangumiSearchOptions {
    int page = 1;
    int limit = 20;
    std::optional<int> type;           // 条目类型过滤
    std::optional<int> platform;       // 平台过滤
    std::optional<double> minScore;    // 最低评分
    std::optional<double> maxScore;    // 最高评分
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
        const std::vector<BangumiSearchDoc>& subjects,
        std::optional<std::function<void(int processed, int total)>> onProgress = std::nullopt
    );
    
    // 删除单个 Bangumi 条目
    static SearchResult<void> deleteSubject(int subjectId);
    
    // 清空所有 Bangumi 条目
    static SearchResult<void> clearAllSubjects();

    // ============ 搜索 ============
    
    // 搜索 Bangumi 条目
    static SearchResult<BangumiSearchResult> search(
        const std::string& query,
        const BangumiSearchOptions& options = {}
    );
    
    // 获取 Bangumi 索引统计
    static SearchResult<IndexStats> getIndexStats();
    
    // 获取类型分布统计
    static SearchResult<std::map<int, int>> getTypeStats();

private:
    // 更新索引设置
    static SearchResult<void> updateIndexSettings();
};

#endif // BANGUMISEARCH_H
