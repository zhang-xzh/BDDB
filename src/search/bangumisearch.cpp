#include "search/bangumisearch.h"

#include <QJsonObject>
#include <QJsonArray>
#include <QString>

// BangumiSearchDoc 实现

QString BangumiSearchDoc::toJson() const {
    QJsonObject obj;
    obj["subject_id"] = subjectId;
    obj["name"] = name;
    obj["name_cn"] = nameCn;
    obj["type"] = type;
    obj["type_name"] = typeName;
    obj["summary"] = summary;
    obj["url"] = url;
    obj["nsfw"] = nsfw;

    if (platform) obj["platform"] = *platform;
    if (platformName) obj["platform_name"] = *platformName;
    if (date) obj["date"] = *date;
    if (score) obj["score"] = *score;
    if (rank) obj["rank"] = *rank;

    QJsonArray tagsArray;
    for (const auto &tag: tags) {
        tagsArray.append(tag);
    }
    if (!tagsArray.isEmpty()) {
        obj["tags"] = tagsArray;
    }

    QJsonDocument doc(obj);
    return QString::fromUtf8(doc.toJson(QJsonDocument::Compact));
}

// BangumiSearchService 实现

SearchResult<void> BangumiSearchService::setupIndex() {
    auto &client = MeiliSearchClient::instance();

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

SearchResult<void> BangumiSearchService::indexSubject(const BangumiSearchDoc &subject) {
    QList subjects{subject};
    return bulkIndexSubjects(subjects);
}

SearchResult<void> BangumiSearchService::bulkIndexSubjects(
    const QList<BangumiSearchDoc> &subjects,
    std::optional<std::function<void(qint32 processed, qint32 total)> > onProgress
) {
    if (subjects.empty()) return {};

    auto &client = MeiliSearchClient::instance();

    // 构建 JSON 数组
    QJsonArray array;
    for (const auto &subject: subjects) {
        QJsonDocument doc = QJsonDocument::fromJson(subject.toJson().toUtf8());
        array.append(doc.object());
    }

    QJsonDocument doc(array);
    QString json = QString::fromUtf8(doc.toJson(QJsonDocument::Compact));

    auto result = client.addDocuments(kIndexName, json);
    if (!result) return result;

    if (onProgress) {
        (*onProgress)(static_cast<qint32>(subjects.size()), static_cast<qint32>(subjects.size()));
    }

    return {};
}

SearchResult<void> BangumiSearchService::deleteSubject(qint32 subjectId) {
    return MeiliSearchClient::instance().deleteDocument(kIndexName, QString::number(subjectId));
}

SearchResult<void> BangumiSearchService::clearAllSubjects() {
    return MeiliSearchClient::instance().deleteAllDocuments(kIndexName);
}

SearchResult<BangumiSearchResult> BangumiSearchService::search(
    const QString &query,
    const BangumiSearchOptions &options
) {
    auto &client = MeiliSearchClient::instance();

    qint32 offset = (options.page - 1) * options.limit;

    // 构建过滤条件
    QList<QString> filters;

    if (options.type) {
        filters.push_back("type = " + QString::number(*options.type));
    }

    if (options.platform) {
        filters.push_back("platform = " + QString::number(*options.platform));
    }

    if (options.minScore || options.maxScore) {
        qreal min = options.minScore.value_or(0.0);
        qreal max = options.maxScore.value_or(10.0);
        filters.push_back("score " + QString::number(min) + " TO " + QString::number(max));
    }

    if (options.nsfw) {
        filters.push_back("nsfw = " + QString(*options.nsfw ? "true" : "false"));
    }

    QList<QString> sort = {QStringLiteral("rank:asc")};

    auto result = client.searchRaw(kIndexName, query, offset, options.limit, filters, sort);
    if (!result) return std::unexpected(result.error());

    // 解析响应
    QJsonDocument doc = QJsonDocument::fromJson(result->toUtf8());
    if (!doc.isObject()) {
        return std::unexpected(QStringLiteral("Invalid search response"));
    }

    QJsonObject obj = doc.object();
    BangumiSearchResult searchResult;

    // 解析总数
    searchResult.total = static_cast<qint32>(obj["estimatedTotalHits"].toInt());
    searchResult.page = options.page;
    searchResult.totalPages = (searchResult.total + options.limit - 1) / options.limit;

    // 解析结果
    QJsonArray hits = obj["hits"].toArray();
    for (const auto &hit: hits) {
        if (!hit.isObject()) continue;

        QJsonObject hitObj = hit.toObject();
        BangumiSearchDoc subject;

        subject.subjectId = static_cast<qint32>(hitObj["subject_id"].toInt());
        subject.name = hitObj["name"].toString();
        subject.nameCn = hitObj["name_cn"].toString();
        subject.type = static_cast<qint32>(hitObj["type"].toInt());
        subject.typeName = hitObj["type_name"].toString();
        subject.summary = hitObj["summary"].toString();
        subject.url = hitObj["url"].toString();
        subject.nsfw = hitObj["nsfw"].toBool();

        if (hitObj.contains("platform")) {
            subject.platform = static_cast<qint32>(hitObj["platform"].toInt());
        }
        if (hitObj.contains("platform_name")) {
            subject.platformName = hitObj["platform_name"].toString();
        }
        if (hitObj.contains("date")) {
            subject.date = hitObj["date"].toString();
        }
        if (hitObj.contains("score")) {
            subject.score = hitObj["score"].toDouble();
        }
        if (hitObj.contains("rank")) {
            subject.rank = static_cast<qint32>(hitObj["rank"].toInt());
        }

        QJsonArray tags = hitObj["tags"].toArray();
        for (const auto &tag: tags) {
            subject.tags.push_back(tag.toString());
        }

        // 高亮结果
        if (hitObj.contains("_formatted")) {
            QJsonObject formatted = hitObj["_formatted"].toObject();
            if (formatted.contains("name_cn")) {
                subject.highlightNameCn = formatted["name_cn"].toString();
            }
            if (formatted.contains("summary")) {
                subject.highlightSummary = formatted["summary"].toString();
            }
        }

        searchResult.subjects.push_back(std::move(subject));
    }

    return searchResult;
}

SearchResult<IndexStats> BangumiSearchService::getIndexStats() {
    return MeiliSearchClient::instance().getIndexStats(kIndexName);
}

SearchResult<QMap<qint32, qint32> > BangumiSearchService::getTypeStats() {
    auto &client = MeiliSearchClient::instance();

    // 使用 facet search 获取类型分布
    // Meilisearch facet 搜索通过在搜索请求中添加 facets 参数
    auto result = client.searchRaw(kIndexName, "", 0, 0, {}, {});
    if (!result) return std::unexpected(result.error());

    // 解析 facetDistribution
    QJsonDocument doc = QJsonDocument::fromJson(result->toUtf8());
    if (!doc.isObject()) {
        return std::unexpected(QStringLiteral("Invalid stats response"));
    }

    QJsonObject obj = doc.object();
    QMap<qint32, qint32> typeStats;

    QJsonObject facetDistribution = obj["facetDistribution"].toObject();
    QJsonObject typeDistribution = facetDistribution["type"].toObject();

    for (const QString &key: typeDistribution.keys()) {
        qint32 type = key.toInt();
        qint32 count = static_cast<qint32>(typeDistribution[key].toInt());
        typeStats[type] = count;
    }

    return typeStats;
}

SearchResult<void> BangumiSearchService::updateIndexSettings() {
    // 索引设置通常在创建时配置
    return {};
}
