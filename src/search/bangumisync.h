#ifndef BANGUMISYNC_H
#define BANGUMISYNC_H

#include "search/bangumisearch.h"
#include "models/models.h"
#include <vector>
#include <string>
#include <optional>
#include <functional>

// Bangumi 同步结果
struct BangumiSyncResult {
    int total = 0;
    int indexed = 0;
    int failed = 0;
};

// 同步进度回调
using BangumiSyncProgressCallback = std::function<void(int processed, int total)>;

// Bangumi 同步服务
class BangumiSyncService {
public:
    // 将 BangumiSubjectDoc 转换为搜索文档
    static BangumiSearchDoc convertToSearchDoc(const BangumiSubjectDoc& subject);

    // 全量同步所有 Bangumi 条目
    static SearchResult<BangumiSyncResult> syncAllSubjects(
        std::optional<BangumiSyncProgressCallback> onProgress = std::nullopt,
        int batchSize = 1000
    );

    // 同步单个条目
    static SearchResult<void> syncSingleSubject(int subjectId);

    // 同步多个条目
    static SearchResult<void> syncSubjectsByIds(
        const std::vector<int>& subjectIds
    );

    // 重建索引（删除并重新创建，然后全量同步）
    static SearchResult<BangumiSyncResult> rebuildIndex(
        std::optional<BangumiSyncProgressCallback> onProgress = std::nullopt
    );

    // 清空索引
    static SearchResult<void> clearIndex();

private:
    // 获取条目类型名称
    static std::string getSubjectTypeName(int type);
    
    // 辅助函数：处理一批条目
    static SearchResult<int> processBatch(
        const std::vector<BangumiSubjectDoc>& subjects,
        int& processed,
        int total,
        std::optional<BangumiSyncProgressCallback> onProgress
    );
};

#endif // BANGUMISYNC_H
