#include "search/productsearch.h"

#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <QString>
#include <ranges>

// ProductSearchDoc 实现

std::string ProductSearchDoc::toJson() const {
    QJsonObject obj;
    obj["product_id"] = QString::fromStdString(productId);
    obj["title"] = QString::fromStdString(title);
    
    if (manufacturer) obj["manufacturer"] = QString::fromStdString(*manufacturer);
    if (scenario) obj["scenario"] = QString::fromStdString(*scenario);
    if (modelNumber) obj["model_number"] = QString::fromStdString(*modelNumber);
    if (releaseDate) obj["release_date"] = QString::fromStdString(*releaseDate);
    if (price) obj["price"] = QString::fromStdString(*price);
    if (url) obj["url"] = QString::fromStdString(*url);
    if (noteRaw) obj["note_raw"] = QString::fromStdString(*noteRaw);
    
    QJsonArray voiceActorsArray;
    for (const auto& va : voiceActors) {
        voiceActorsArray.append(QString::fromStdString(va));
    }
    if (!voiceActorsArray.isEmpty()) {
        obj["voice_actors"] = voiceActorsArray;
    }
    
    QJsonArray artistsArray;
    for (const auto& artist : artists) {
        artistsArray.append(QString::fromStdString(artist));
    }
    if (!artistsArray.isEmpty()) {
        obj["artists"] = artistsArray;
    }
    
    QJsonArray imagesArray;
    for (const auto& img : images) {
        imagesArray.append(QString::fromStdString(img));
    }
    if (!imagesArray.isEmpty()) {
        obj["images"] = imagesArray;
    }
    
    QJsonDocument doc(obj);
    return doc.toJson(QJsonDocument::Compact).toStdString();
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
    std::vector<ProductSearchDoc> products{product};
    return bulkIndexProducts(products);
}

SearchResult<void> ProductSearchService::bulkIndexProducts(
    const std::vector<ProductSearchDoc>& products,
    std::optional<std::function<void(int processed, int total)>> onProgress
) {
    if (products.empty()) return {};
    
    auto& client = MeiliSearchClient::instance();
    
    // 构建 JSON 数组
    QJsonArray array;
    for (const auto& product : products) {
        QJsonDocument doc = QJsonDocument::fromJson(
            QByteArray::fromStdString(product.toJson())
        );
        array.append(doc.object());
    }
    
    QJsonDocument doc(array);
    std::string json = doc.toJson(QJsonDocument::Compact).toStdString();
    
    auto result = client.addDocuments(kIndexName, json);
    if (!result) return result;
    
    if (onProgress) {
        (*onProgress)(static_cast<int>(products.size()), static_cast<int>(products.size()));
    }
    
    return {};
}

SearchResult<ProductSearchResult> ProductSearchService::searchProducts(
    const std::string& query,
    const ProductSearchOptions& options
) {
    auto& client = MeiliSearchClient::instance();
    
    int offset = (options.page - 1) * options.limit;
    
    std::vector<std::string> filter;
    if (options.filter) {
        filter.push_back(*options.filter);
    }
    
    std::vector<std::string> sort = {"product_id:asc"};
    
    auto result = client.searchRaw(kIndexName, query, offset, options.limit, filter, sort);
    if (!result) return std::unexpected(result.error());
    
    // 解析响应
    QJsonDocument doc = QJsonDocument::fromJson(QByteArray::fromStdString(*result));
    if (!doc.isObject()) {
        return std::unexpected("Invalid search response");
    }
    
    QJsonObject obj = doc.object();
    ProductSearchResult searchResult;
    
    // 解析总数
    searchResult.total = obj["estimatedTotalHits"].toInt();
    searchResult.page = options.page;
    searchResult.totalPages = (searchResult.total + options.limit - 1) / options.limit;
    
    // 解析结果
    QJsonArray hits = obj["hits"].toArray();
    for (const auto& hit : hits) {
        if (!hit.isObject()) continue;
        
        QJsonObject hitObj = hit.toObject();
        ProductSearchDoc product;
        
        product.productId = hitObj["product_id"].toString().toStdString();
        product.title = hitObj["title"].toString().toStdString();
        
        if (hitObj.contains("manufacturer")) {
            product.manufacturer = hitObj["manufacturer"].toString().toStdString();
        }
        if (hitObj.contains("scenario")) {
            product.scenario = hitObj["scenario"].toString().toStdString();
        }
        if (hitObj.contains("model_number")) {
            product.modelNumber = hitObj["model_number"].toString().toStdString();
        }
        if (hitObj.contains("release_date")) {
            product.releaseDate = hitObj["release_date"].toString().toStdString();
        }
        if (hitObj.contains("price")) {
            product.price = hitObj["price"].toString().toStdString();
        }
        if (hitObj.contains("url")) {
            product.url = hitObj["url"].toString().toStdString();
        }
        if (hitObj.contains("note_raw")) {
            product.noteRaw = hitObj["note_raw"].toString().toStdString();
        }
        
        QJsonArray voiceActors = hitObj["voice_actors"].toArray();
        for (const auto& va : voiceActors) {
            product.voiceActors.push_back(va.toString().toStdString());
        }
        
        QJsonArray artists = hitObj["artists"].toArray();
        for (const auto& artist : artists) {
            product.artists.push_back(artist.toString().toStdString());
        }
        
        QJsonArray images = hitObj["images"].toArray();
        for (const auto& img : images) {
            product.images.push_back(img.toString().toStdString());
        }
        
        // 高亮结果
        if (hitObj.contains("_formatted")) {
            QJsonObject formatted = hitObj["_formatted"].toObject();
            if (formatted.contains("title")) {
                product.highlightTitle = formatted["title"].toString().toStdString();
            }
        }
        
        searchResult.products.push_back(std::move(product));
    }
    
    return searchResult;
}

SearchResult<void> ProductSearchService::deleteProductIndex(const std::string& productId) {
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
