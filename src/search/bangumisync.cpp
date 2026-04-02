#include "search/bangumisync.h"
#include "search/bangumisearch.h"
#include "db/bangumirepository.h"
#include <QtConcurrent>

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

QFuture<BangumiSyncResult> BangumiSyncService::syncAllSubjects(qint32 batchSize) {
    return QtConcurrent::run([batchSize]() -> BangumiSyncResult {
        BangumiSyncResult result;
        
        // 获取总数
        auto totalResult = BangumiRepository::getTotalSubjectsCount();
        if (!totalResult) {
            return result;
        }
        result.total = *totalResult;
        
        if (result.total == 0) {
            return result;
        }
        
        // 确保索引存在
        auto setup = BangumiSearchService::setupIndex();
        if (!setup) {
            return result;
        }
        
        // 批量处理
        qint32 processed = 0;
        qint32 skip = 0;
        
        while (processed < result.total) {
            auto subjects = BangumiRepository::getAllSubjects(batchSize, skip);
            if (!subjects || subjects->empty()) {
                result.failed += (result.total - processed);
                break;
            }
            
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
        }
        
        return result;
    });
}

QFuture<void> BangumiSyncService::syncSingleSubject(qint32 subjectId) {
    return QtConcurrent::run([subjectId]() {
        auto subject = BangumiRepository::getSubjectById(subjectId);
        if (!subject || subject->id == 0) {
            return;
        }
        
        auto doc = convertToSearchDoc(*subject);
        BangumiSearchService::indexSubject(doc);
    });
}

QFuture<void> BangumiSyncService::syncSubjectsByIds(const QList<qint32>& subjectIds) {
    return QtConcurrent::run([subjectIds]() {
        QList<BangumiSearchDoc> docs;
        docs.reserve(subjectIds.size());
        
        for (qint32 subjectId : subjectIds) {
            auto subject = BangumiRepository::getSubjectById(subjectId);
            if (subject && subject->id != 0) {
                docs.push_back(convertToSearchDoc(*subject));
            }
        }
        
        if (!docs.empty()) {
            BangumiSearchService::bulkIndexSubjects(docs);
        }
    });
}

QFuture<BangumiSyncResult> BangumiSyncService::rebuildIndex() {
    return QtConcurrent::run([]() -> BangumiSyncResult {
        return rebuildIndexSync();
    });
}

BangumiSyncResult BangumiSyncService::rebuildIndexSync(std::function<void(int processed, int total)> onProgress) {
    BangumiSyncResult result;
    
    // 删除索引
    BangumiSearchService::deleteIndex();
    
    // 重新创建索引
    auto setupResult = BangumiSearchService::setupIndex();
    if (!setupResult) {
        return result;
    }
    
    // 获取总数
    auto totalResult = BangumiRepository::getTotalSubjectsCount();
    if (!totalResult) {
        return result;
    }
    result.total = *totalResult;
    
    if (result.total == 0) {
        return result;
    }
    
    // 批量处理
    qint32 processed = 0;
    qint32 skip = 0;
    qint32 batchSize = 1000;
    
    while (processed < result.total) {
        auto subjects = BangumiRepository::getAllSubjects(batchSize, skip);
        if (!subjects || subjects->empty()) {
            result.failed += (result.total - processed);
            break;
        }
        
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
            onProgress(processed, result.total);
        }
    }
    
    return result;
}

QFuture<void> BangumiSyncService::clearIndex() {
    return QtConcurrent::run([]() {
        BangumiSearchService::clearAllSubjects();
    });
}

QString BangumiSyncService::getSubjectTypeName(qint32 type) {
    return ::getSubjectTypeName(type);
}

qint32 BangumiSyncService::processBatch(
    const QList<BangumiSubjectDoc>& subjects,
    qint32& processed,
    qint32 total,
    QFutureInterface<BangumiSyncResult>& futureInterface) {
    
    // 转换为搜索文档
    QList<BangumiSearchDoc> docs;
    docs.reserve(subjects.size());
    for (const auto& subject : subjects) {
        docs.push_back(convertToSearchDoc(subject));
    }
    
    // 批量索引
    auto result = BangumiSearchService::bulkIndexSubjects(docs);
    
    processed += static_cast<qint32>(subjects.size());
    futureInterface.setProgressValue(processed);
    
    return result ? static_cast<qint32>(subjects.size()) : 0;
}
