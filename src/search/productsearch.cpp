#include "search/productsearch.h"

#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <QString>
#include <ranges>

// ProductSearchDoc 实现

QString ProductSearchDoc::toJson() const {
    QJsonObject obj;
    obj["product_id"] = productId;
    obj["title"] = title;
    
    if (manufacturer) obj["manufacturer"] = *manufacturer;
    if (scenario) obj["scenario"] = *scenario;
    if (modelNumber) obj["model_number"] = *modelNumber;
    if (releaseDate) obj["release_date"] = *releaseDate;
    if (price) obj["price"] = *price;
    if (url) obj["url"] = *url;
    if (noteRaw) obj["note_raw"] = *noteRaw;
    
    QJsonArray voiceActorsArray;
    for (const auto& va : voiceActors) {
        voiceActorsArray.append(va);
    }
    if (!voiceActorsArray.isEmpty()) {
        obj["voice_actors"] = voiceActorsArray;
    }
    
    QJsonArray artistsArray;
    for (const auto& artist : artists) {
        artistsArray.append(artist);
    }
    if (!artistsArray.isEmpty()) {
        obj["artists"] = artistsArray;
    }
    
    QJsonArray imagesArray;
    for (const auto& img : images) {
        imagesArray.append(img);
    }
    if (!imagesArray.isEmpty()) {
        obj["images"] = imagesArray;
    }
    
    QJsonDocument doc(obj);
    return QString::fromUtf8(doc.toJson(QJsonDocument::Compact));
}

ProductSearchDoc ProductSearchDoc::fromProduct(const Product& product) {
    ProductSearchDoc doc;
    doc.productId = product.productId;
    doc.title = product.title;
    doc.url = product.url;
    doc.images = product.images;
    doc.noteRaw = product.noteRaw;
    doc.manufacturer = product.attributes.manufacturer;
    doc.scenario = product.attributes.scenario;
    doc.modelNumber = product.attributes.catalogNo;
    doc.releaseDate = product.attributes.releaseDate;
    doc.price = product.attributes.price;
    doc.voiceActors = product.attributes.voiceActors;
    doc.artists = product.attributes.illustrators;
    return doc;
}

// ProductSearchService 实现

SearchResult<void> ProductSearchService::setupIndex() {
    auto& client = MeiliSearchClient::instance();
    
    auto exists = client.indexExists(kIndexName);
    if (!exists) return std::unexpected(exists.error());
    
    if (!*exists) {
        auto create = client.createIndex(kIndexName, "product_id");
        if (!create) return create;
    }
    
    return updateIndexSettings();
}

SearchResult<void> ProductSearchService::deleteIndex() {
    return MeiliSearchClient::instance().deleteIndex(kIndexName);
}

SearchResult<void> ProductSearchService::indexProduct(const ProductSearchDoc& product) {
    QList<ProductSearchDoc> products{product};
    return bulkIndexProducts(products);
}

SearchResult<void> ProductSearchService::bulkIndexProducts(
    const QList<ProductSearchDoc>& products,
    std::optional<std::function<void(qint32 processed, qint32 total)>> onProgress
) {
    if (products.empty()) return {};
    
    auto& client = MeiliSearchClient::instance();
    
    // 构建 JSON 数组
    QJsonArray array;
    for (const auto& product : products) {
        QJsonDocument doc = QJsonDocument::fromJson(product.toJson().toUtf8());
        array.append(doc.object());
    }
    
    QJsonDocument doc(array);
    QString json = QString::fromUtf8(doc.toJson(QJsonDocument::Compact));
    
    auto result = client.addDocuments(kIndexName, json);
    if (!result) return result;
    
    if (onProgress) {
        (*onProgress)(static_cast<qint32>(products.size()), static_cast<qint32>(products.size()));
    }
    
    return {};
}

SearchResult<ProductSearchResult> ProductSearchService::searchProducts(
    const QString& query,
    const ProductSearchOptions& options
) {
    auto& client = MeiliSearchClient::instance();
    
    qint32 offset = (options.page - 1) * options.limit;
    
    QList<QString> filter;
    if (options.filter) {
        filter.push_back(*options.filter);
    }
    
    QList<QString> sort = {QStringLiteral("product_id:asc")};
    
    auto result = client.searchRaw(kIndexName, query, offset, options.limit, filter, sort);
    if (!result) return std::unexpected(result.error());
    
    // 解析响应
    QJsonDocument doc = QJsonDocument::fromJson(result->toUtf8());
    if (!doc.isObject()) {
        return std::unexpected(QStringLiteral("Invalid search response"));
    }
    
    QJsonObject obj = doc.object();
    ProductSearchResult searchResult;
    
    // 解析总数
    searchResult.total = static_cast<qint32>(obj["estimatedTotalHits"].toInt());
    searchResult.page = options.page;
    searchResult.totalPages = (searchResult.total + options.limit - 1) / options.limit;
    
    // 解析结果
    QJsonArray hits = obj["hits"].toArray();
    for (const auto& hit : hits) {
        if (!hit.isObject()) continue;
        
        QJsonObject hitObj = hit.toObject();
        ProductSearchDoc product;
        
        product.productId = hitObj["product_id"].toString();
        product.title = hitObj["title"].toString();
        
        if (hitObj.contains("manufacturer")) {
            product.manufacturer = hitObj["manufacturer"].toString();
        }
        if (hitObj.contains("scenario")) {
            product.scenario = hitObj["scenario"].toString();
        }
        if (hitObj.contains("model_number")) {
            product.modelNumber = hitObj["model_number"].toString();
        }
        if (hitObj.contains("release_date")) {
            product.releaseDate = hitObj["release_date"].toString();
        }
        if (hitObj.contains("price")) {
            product.price = hitObj["price"].toString();
        }
        if (hitObj.contains("url")) {
            product.url = hitObj["url"].toString();
        }
        if (hitObj.contains("note_raw")) {
            product.noteRaw = hitObj["note_raw"].toString();
        }
        
        QJsonArray voiceActors = hitObj["voice_actors"].toArray();
        for (const auto& va : voiceActors) {
            product.voiceActors.push_back(va.toString());
        }
        
        QJsonArray artists = hitObj["artists"].toArray();
        for (const auto& artist : artists) {
            product.artists.push_back(artist.toString());
        }
        
        QJsonArray images = hitObj["images"].toArray();
        for (const auto& img : images) {
            product.images.push_back(img.toString());
        }
        
        // 高亮结果
        if (hitObj.contains("_formatted")) {
            QJsonObject formatted = hitObj["_formatted"].toObject();
            if (formatted.contains("title")) {
                product.highlightTitle = formatted["title"].toString();
            }
        }
        
        searchResult.products.push_back(std::move(product));
    }
    
    return searchResult;
}

SearchResult<void> ProductSearchService::deleteProductIndex(const QString& productId) {
    return MeiliSearchClient::instance().deleteDocument(kIndexName, productId);
}

SearchResult<void> ProductSearchService::clearAllProducts() {
    return MeiliSearchClient::instance().deleteAllDocuments(kIndexName);
}

SearchResult<IndexStats> ProductSearchService::getIndexStats() {
    return MeiliSearchClient::instance().getIndexStats(kIndexName);
}

SearchResult<void> ProductSearchService::updateIndexSettings() {
    // 索引设置通过 Meilisearch API 配置
    // 这里可以添加调用 settings API 的代码
    // 暂时返回成功，因为通常索引设置在创建时通过 Meilisearch 控制台或初始化脚本配置
    return {};
}
