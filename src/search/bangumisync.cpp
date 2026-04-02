#include "search/bangumisync.h"
#include "search/bangumisearch.h"
#include "db/bangumirepository.h"

#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <ranges>

// 条目类型名称映射
static const QString SUBJECT_TYPE_NAMES[] = {
    QStringLiteral("未知"),     // 0
    QStringLiteral("书籍"),     // 1
    QStringLiteral("动画"),     // 2
    QStringLiteral("音乐"),     // 3
    QStringLiteral("游戏"),     // 4
    QStringLiteral("未知"),     // 5
    QStringLiteral("三次元")    // 6
};

static QString getSubjectTypeName(qint32 type) {
    if (type >= 0 && type < 7) {
        return SUBJECT_TYPE_NAMES[type];
    }
    return QStringLiteral("未知");
}

// Bangumi URL 辅助函数
static QString getSubjectUrl(qint32 subjectId) {
    return QStringLiteral("https://bgm.tv/subject/") + QString::number(subjectId);
}

BangumiSearchDoc BangumiSyncService::convertToSearchDoc(const BangumiSubjectDoc& subject) {
    BangumiSearchDoc doc;
    doc.subjectId = subject.id;
    doc.name = subject.name;
    doc.nameCn = subject.nameCn;
    doc.type = subject.type;
    doc.typeName = getSubjectTypeName(subject.type);
    doc.summary = subject.summary;
    doc.date = subject.date;
    doc.score = subject.score;
    doc.rank = subject.rank;
    doc.url = getSubjectUrl(subject.id);
    doc.nsfw = subject.nsfw;
    
    // 从 scoreDetails 构建 tags
    for (const auto& [key, value] : subject.scoreDetails.asKeyValueRange()) {
        if (!key.isEmpty()) {
            doc.tags.push_back(key);
        }
    }
    
    return doc;
}

SearchResult<BangumiSyncResult> BangumiSyncService::syncAllSubjects(
    std::optional<BangumiSyncProgressCallback> onProgress,
    qint32 batchSize
) {
    BangumiSyncResult result;
    
    // 获取总数
    auto totalResult = BangumiRepository::getTotalSubjectsCount();
    if (!totalResult) {
        return std::unexpected(QStringLiteral("Failed to get total count: ") + totalResult.error());
    }
    result.total = *totalResult;
    
    if (result.total == 0) {
        return result;
    }
    
    // 确保索引存在
    auto setup = BangumiSearchService::setupIndex();
    if (!setup) {
        return std::unexpected(QStringLiteral("Failed to setup index: ") + setup.error());
    }
    
    // 批量处理
    qint32 processed = 0;
    qint32 skip = 0;
    
    while (processed < result.total) {
        auto subjects = BangumiRepository::getAllSubjects(batchSize, skip);
        if (!subjects) {
            result.failed += (result.total - processed);
            break;
        }
        
        if (subjects->empty()) break;
        
        // 转换为搜索文档
        QList<BangumiSearchDoc> docs;
        docs.reserve(subjects->size());
        for (const auto& subject : *subjects) {
            docs.push_back(convertToSearchDoc(subject));
        }
        
        // 批量索引
        auto indexResult = BangumiSearchService::bulkIndexSubjects(docs);
        if (!indexResult) {
            result.failed += static_cast<qint32>(subjects->size());
        } else {
            result.indexed += static_cast<qint32>(subjects->size());
        }
        
        processed += static_cast<qint32>(subjects->size());
        skip += batchSize;
        
        if (onProgress) {
            (*onProgress)(processed, result.total);
        }
    }
    
    return result;
}

SearchResult<void> BangumiSyncService::syncSingleSubject(qint32 subjectId) {
    auto subject = BangumiRepository::getSubjectById(subjectId);
    if (!subject) {
        return std::unexpected(QStringLiteral("Failed to get subject: ") + subject.error());
    }
    
    if (subject->id == 0) {
        return std::unexpected(QStringLiteral("Subject not found: ") + QString::number(subjectId));
    }
    
    auto doc = convertToSearchDoc(*subject);
    return BangumiSearchService::indexSubject(doc);
}

SearchResult<void> BangumiSyncService::syncSubjectsByIds(
    const QList<qint32>& subjectIds
) {
    QList<BangumiSearchDoc> docs;
    docs.reserve(subjectIds.size());
    
    for (qint32 subjectId : subjectIds) {
        auto subject = BangumiRepository::getSubjectById(subjectId);
        if (subject && subject->id != 0) {
            docs.push_back(convertToSearchDoc(*subject));
        }
    }
    
    if (!docs.empty()) {
        return BangumiSearchService::bulkIndexSubjects(docs);
    }
    
    return {};
}

SearchResult<BangumiSyncResult> BangumiSyncService::rebuildIndex(
    std::optional<BangumiSyncProgressCallback> onProgress
) {
    // 删除索引
    auto deleteResult = BangumiSearchService::deleteIndex();
    if (!deleteResult) {
        return std::unexpected(QStringLiteral("Failed to delete index: ") + deleteResult.error());
    }
    
    // 重新创建索引
    auto setupResult = BangumiSearchService::setupIndex();
    if (!setupResult) {
        return std::unexpected(QStringLiteral("Failed to setup index: ") + setupResult.error());
    }
    
    // 全量同步
    return syncAllSubjects(onProgress);
}

SearchResult<void> BangumiSyncService::clearIndex() {
    return BangumiSearchService::clearAllSubjects();
}

QString BangumiSyncService::getSubjectTypeName(qint32 type) {
    return ::getSubjectTypeName(type);
}

SearchResult<qint32> BangumiSyncService::processBatch(
    const QList<BangumiSubjectDoc>& subjects,
    qint32& processed,
    qint32 total,
    std::optional<BangumiSyncProgressCallback> onProgress
) {
    // 转换为搜索文档
    QList<BangumiSearchDoc> docs;
    docs.reserve(subjects.size());
    for (const auto& subject : subjects) {
        docs.push_back(convertToSearchDoc(subject));
    }
    
    // 批量索引
    auto result = BangumiSearchService::bulkIndexSubjects(docs);
    if (!result) {
        return std::unexpected(result.error());
    }
    
    processed += static_cast<qint32>(subjects.size());
    
    if (onProgress) {
        (*onProgress)(processed, total);
    }
    
    return static_cast<qint32>(subjects.size());
}
