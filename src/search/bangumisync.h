#ifndef BANGUMISYNC_H
#define BANGUMISYNC_H

#include "search/bangumisearch.h"
#include "models/models.h"
#include <QFuture>
#include <QFutureInterface>

// Bangumi 同步结果
struct BangumiSyncResult {
    qint32 total = 0;
    qint32 indexed = 0;
    qint32 failed = 0;

    bool operator==(const BangumiSyncResult&) const = default;
};

// Bangumi 同步服务
class BangumiSyncService {
public:
    // 将 BangumiSubjectDoc 转换为搜索文档
    static BangumiSearchDoc convertToSearchDoc(const BangumiSubjectDoc& subject);

    // 全量同步所有 Bangumi 条目
    static QFuture<BangumiSyncResult> syncAllSubjects(qint32 batchSize = 1000);

    // 同步单个条目
    static QFuture<void> syncSingleSubject(qint32 subjectId);

    // 同步多个条目
    static QFuture<void> syncSubjectsByIds(const QList<qint32>& subjectIds);

    // 重建索引（删除并重新创建，然后全量同步）- 异步
    static QFuture<BangumiSyncResult> rebuildIndex();
    
    // 重建索引 - 同步带回调
    static BangumiSyncResult rebuildIndexSync(std::function<void(int processed, int total)> onProgress = nullptr);

    // 清空索引
    static QFuture<void> clearIndex();

private:
    // 获取条目类型名称
    static QString getSubjectTypeName(qint32 type);
    
    // 辅助函数：处理一批条目
    static qint32 processBatch(
        const QList<BangumiSubjectDoc>& subjects,
        qint32& processed,
        qint32 total,
        QFutureInterface<BangumiSyncResult>& futureInterface);
};

#endif // BANGUMISYNC_H
