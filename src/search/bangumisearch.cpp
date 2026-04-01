#include "search/bangumisearch.h"

#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <QString>
#include <ranges>

// BangumiSearchDoc 实现

std::string BangumiSearchDoc::toJson() const {
    QJsonObject obj;
    obj["subject_id"] = subjectId;
    obj["name"] = QString::fromStdString(name);
    obj["name_cn"] = QString::fromStdString(nameCn);
    obj["type"] = type;
    obj["type_name"] = QString::fromStdString(typeName);
    obj["summary"] = QString::fromStdString(summary);
    obj["url"] = QString::fromStdString(url);
    obj["nsfw"] = nsfw;
    
    if (platform) obj["platform"] = *platform;
    if (platformName) obj["platform_name"] = QString::fromStdString(*platformName);
    if (date) obj["date"] = QString::fromStdString(*date);
    if (score) obj["score"] = *score;
    if (rank) obj["rank"] = *rank;
    
    QJsonArray tagsArray;
    for (const auto& tag : tags) {
        tagsArray.append(QString::fromStdString(tag));
    }
    if (!tagsArray.isEmpty()) {
        obj["tags"] = tagsArray;
    }
    
    QJsonDocument doc(obj);
    return doc.toJson(QJsonDocument::Compact).toStdString();
}

// BangumiSearchService 实现

SearchResult<void> BangumiSearchService::setupIndex() {
    auto& client = MeiliSearchClient::instance();
    
    auto exists = client.indexExists(kIndexName);
    if (!exists) return std::unexpected(exists.error());
    
    if (!*exists) {
        auto create = client.createIndex(kIndexName, "subject_id");
        if (!create) return create;
    }
    
    return updateIndexSettings();
}

SearchResult<void> BangumiSearchService::deleteIndex() {
    return MeiliSearchClient::instance().deleteIndex(kIndexName);
}

SearchResult<void> BangumiSearchService::indexSubject(const BangumiSearchDoc& subject) {
    std::vector<BangumiSearchDoc> subjects{subject};
    return bulkIndexSubjects(subjects);
}

SearchResult<void> BangumiSearchService::bulkIndexSubjects(
    const std::vector<BangumiSearchDoc>& subjects,
    std::optional<std::function<void(int processed, int total)>> onProgress
) {
    if (subjects.empty()) return {};
    
    auto& client = MeiliSearchClient::instance();
    
    // 构建 JSON 数组
    QJsonArray array;
    for (const auto& subject : subjects) {
        QJsonDocument doc = QJsonDocument::fromJson(
            QByteArray::fromStdString(subject.toJson())
        );
        array.append(doc.object());
    }
    
    QJsonDocument doc(array);
    std::string json = doc.toJson(QJsonDocument::Compact).toStdString();
    
    auto result = client.addDocuments(kIndexName, json);
    if (!result) return result;
    
    if (onProgress) {
        (*onProgress)(static_cast<int>(subjects.size()), static_cast<int>(subjects.size()));
    }
    
    return {};
}

SearchResult<void> BangumiSearchService::deleteSubject(int subjectId) {
    return MeiliSearchClient::instance().deleteDocument(kIndexName, std::to_string(subjectId));
}

SearchResult<void> BangumiSearchService::clearAllSubjects() {
    return MeiliSearchClient::instance().deleteAllDocuments(kIndexName);
}

SearchResult<BangumiSearchResult> BangumiSearchService::search(
    const std::string& query,
    const BangumiSearchOptions& options
) {
    auto& client = MeiliSearchClient::instance();
    
    int offset = (options.page - 1) * options.limit;
    
    // 构建过滤条件
    std::vector<std::string> filters;
    
    if (options.type) {
        filters.push_back("type = " + std::to_string(*options.type));
    }
    
    if (options.platform) {
        filters.push_back("platform = " + std::to_string(*options.platform));
    }
    
    if (options.minScore || options.maxScore) {
        double min = options.minScore.value_or(0.0);
        double max = options.maxScore.value_or(10.0);
        filters.push_back("score " + std::to_string(min) + " TO " + std::to_string(max));
    }
    
    if (options.nsfw) {
        filters.push_back("nsfw = " + std::string(*options.nsfw ? "true" : "false"));
    }
    
    std::vector<std::string> sort = {"rank:asc"};
    
    auto result = client.searchRaw(kIndexName, query, offset, options.limit, filters, sort);
    if (!result) return std::unexpected(result.error());
    
    // 解析响应
    QJsonDocument doc = QJsonDocument::fromJson(QByteArray::fromStdString(*result));
    if (!doc.isObject()) {
        return std::unexpected("Invalid search response");
    }
    
    QJsonObject obj = doc.object();
    BangumiSearchResult searchResult;
    
    // 解析总数
    searchResult.total = obj["estimatedTotalHits"].toInt();
    searchResult.page = options.page;
    searchResult.totalPages = (searchResult.total + options.limit - 1) / options.limit;
    
    // 解析结果
    QJsonArray hits = obj["hits"].toArray();
    for (const auto& hit : hits) {
        if (!hit.isObject()) continue;
        
        QJsonObject hitObj = hit.toObject();
        BangumiSearchDoc subject;
        
        subject.subjectId = hitObj["subject_id"].toInt();
        subject.name = hitObj["name"].toString().toStdString();
        subject.nameCn = hitObj["name_cn"].toString().toStdString();
        subject.type = hitObj["type"].toInt();
        subject.typeName = hitObj["type_name"].toString().toStdString();
        subject.summary = hitObj["summary"].toString().toStdString();
        subject.url = hitObj["url"].toString().toStdString();
        subject.nsfw = hitObj["nsfw"].toBool();
        
        if (hitObj.contains("platform")) {
            subject.platform = hitObj["platform"].toInt();
        }
        if (hitObj.contains("platform_name")) {
            subject.platformName = hitObj["platform_name"].toString().toStdString();
        }
        if (hitObj.contains("date")) {
            subject.date = hitObj["date"].toString().toStdString();
        }
        if (hitObj.contains("score")) {
            subject.score = hitObj["score"].toDouble();
        }
        if (hitObj.contains("rank")) {
            subject.rank = hitObj["rank"].toInt();
        }
        
        QJsonArray tags = hitObj["tags"].toArray();
        for (const auto& tag : tags) {
            subject.tags.push_back(tag.toString().toStdString());
        }
        
        // 高亮结果
        if (hitObj.contains("_formatted")) {
            QJsonObject formatted = hitObj["_formatted"].toObject();
            if (formatted.contains("name_cn")) {
                subject.highlightNameCn = formatted["name_cn"].toString().toStdString();
            }
            if (formatted.contains("summary")) {
                subject.highlightSummary = formatted["summary"].toString().toStdString();
            }
        }
        
        searchResult.subjects.push_back(std::move(subject));
    }
    
    return searchResult;
}

SearchResult<IndexStats> BangumiSearchService::getIndexStats() {
    return MeiliSearchClient::instance().getIndexStats(kIndexName);
}

SearchResult<std::map<int, int>> BangumiSearchService::getTypeStats() {
    auto& client = MeiliSearchClient::instance();
    
    // 使用 facet search 获取类型分布
    // Meilisearch facet 搜索通过在搜索请求中添加 facets 参数
    auto result = client.searchRaw(kIndexName, "", 0, 0, {}, {});
    if (!result) return std::unexpected(result.error());
    
    // 解析 facetDistribution
    QJsonDocument doc = QJsonDocument::fromJson(QByteArray::fromStdString(*result));
    if (!doc.isObject()) {
        return std::unexpected("Invalid stats response");
    }
    
    QJsonObject obj = doc.object();
    std::map<int, int> typeStats;
    
    QJsonObject facetDistribution = obj["facetDistribution"].toObject();
    QJsonObject typeDistribution = facetDistribution["type"].toObject();
    
    for (const QString& key : typeDistribution.keys()) {
        int type = key.toInt();
        int count = typeDistribution[key].toInt();
        typeStats[type] = count;
    }
    
    return typeStats;
}

SearchResult<void> BangumiSearchService::updateIndexSettings() {
    // 索引设置通常在创建时配置
    return {};
}
