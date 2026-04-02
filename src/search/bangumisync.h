#ifndef BANGUMISYNC_H
#define BANGUMISYNC_H

#include "search/bangumisearch.h"
#include "models/models.h"
#include <QList>
#include <QString>
#include <optional>
#include <functional>

// Bangumi 同步结果
struct BangumiSyncResult {
    qint32 total = 0;
    qint32 indexed = 0;
    qint32 failed = 0;

    bool operator==(const BangumiSyncResult&) const = default;
};

// 同步进度回调
using BangumiSyncProgressCallback = std::function<void(qint32 processed, qint32 total)>;

// Bangumi 同步服务
class BangumiSyncService {
public:
    // 将 BangumiSubjectDoc 转换为搜索文档
    static BangumiSearchDoc convertToSearchDoc(const BangumiSubjectDoc& subject);

    // 全量同步所有 Bangumi 条目
    static SearchResult<BangumiSyncResult> syncAllSubjects(
        std::optional<BangumiSyncProgressCallback> onProgress = std::nullopt,
        qint32 batchSize = 1000
    );

    // 同步单个条目
    static SearchResult<void> syncSingleSubject(qint32 subjectId);

    // 同步多个条目
    static SearchResult<void> syncSubjectsByIds(
        const QList<qint32>& subjectIds
    );

    // 重建索引（删除并重新创建，然后全量同步）
    static SearchResult<BangumiSyncResult> rebuildIndex(
        std::optional<BangumiSyncProgressCallback> onProgress = std::nullopt
    );

    // 清空索引
    static SearchResult<void> clearIndex();

private:
    // 获取条目类型名称
    static QString getSubjectTypeName(qint32 type);
    
    // 辅助函数：处理一批条目
    static SearchResult<qint32> processBatch(
        const QList<BangumiSubjectDoc>& subjects,
        qint32& processed,
        qint32 total,
        std::optional<BangumiSyncProgressCallback> onProgress
    );
};

#endif // BANGUMISYNC_H
