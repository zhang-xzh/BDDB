#include "search/productsync.h"
#include "search/productsearch.h"
#include "db/surugayarepository.h"
#include "db/connection.h"

#include <mongocxx/collection.hpp>
#include <mongocxx/database.hpp>
#include <bsoncxx/builder/basic/document.hpp>
#include <bsoncxx/builder/basic/kvp.hpp>
#include <unordered_set>

using bsoncxx::builder::basic::kvp;
using bsoncxx::builder::basic::make_document;

ProductSearchDoc ProductSyncService::convertToSearchDoc(const Product& product) {
    return ProductSearchDoc::fromProduct(product);
}

SearchResult<SyncResult> ProductSyncService::syncAllProducts(
    std::optional<SyncProgressCallback> onProgress,
    int batchSize
) {
    SyncResult result;
    
#ifdef HAVE_MONGODB
    try {
        if (!MongoConnection::instance().isConnected()) {
            return std::unexpected("MongoDB not connected");
        }
        
        auto db = MongoConnection::instance().database("suruga_ya");
        auto collection = db["products"];
        
        // 获取总数
        auto totalDoc = collection.count_documents({});
        result.total = static_cast<int>(totalDoc);
        
        if (result.total == 0) {
            return result;
        }
        
        // 清空现有索引
        auto clear = ProductSearchService::clearAllProducts();
        if (!clear) {
            return std::unexpected("Failed to clear index: " + clear.error());
        }
        
        // 批量处理
        int processed = 0;
        std::string lastId;
        
        while (processed < result.total) {
            auto filter = make_document();
            if (!lastId.empty()) {
                filter = make_document(kvp("product_id", make_document(kvp("$gt", lastId))));
            }
            
            mongocxx::options::find opts;
            opts.sort(make_document(kvp("product_id", 1)));
            opts.limit(batchSize);
            auto cursor = collection.find(filter.view(), opts);
            
            std::vector<Product> products;
            for (auto&& doc : cursor) {
                // 解析产品
                Product product;
                if (doc["product_id"]) {
                    product.productId = std::string(doc["product_id"].get_string().value);
                }
                if (doc["title"]) {
                    product.title = std::string(doc["title"].get_string().value);
                }
                if (doc["url"]) {
                    product.url = std::string(doc["url"].get_string().value);
                }
                if (doc["note_raw"]) {
                    product.noteRaw = std::string(doc["note_raw"].get_string().value);
                }
                if (doc["images"] && doc["images"].type() == bsoncxx::type::k_array) {
                    for (auto&& item : doc["images"].get_array().value) {
                        if (item.type() == bsoncxx::type::k_string) {
                            product.images.push_back(std::string(item.get_string().value));
                        }
                    }
                }
                if (doc["attributes"] && doc["attributes"].type() == bsoncxx::type::k_document) {
                    auto attr = doc["attributes"].get_document().value;
                    if (attr["型番"]) {
                        product.attributes.catalogNo = std::string(attr["型番"].get_string().value);
                    }
                    if (attr["メーカー"]) {
                        product.attributes.manufacturer = std::string(attr["メーカー"].get_string().value);
                    }
                    if (attr["発売日"]) {
                        product.attributes.releaseDate = std::string(attr["発売日"].get_string().value);
                    }
                    if (attr["定価"]) {
                        product.attributes.price = std::string(attr["定価"].get_string().value);
                    }
                    if (attr["シナリオ"]) {
                        product.attributes.scenario = std::string(attr["シナリオ"].get_string().value);
                    }
                    if (attr["原画"] && attr["原画"].type() == bsoncxx::type::k_array) {
                        for (auto&& item : attr["原画"].get_array().value) {
                            if (item.type() == bsoncxx::type::k_string) {
                                product.attributes.illustrators.push_back(std::string(item.get_string().value));
                            }
                        }
                    }
                    if (attr["声優"] && attr["声優"].type() == bsoncxx::type::k_array) {
                        for (auto&& item : attr["声優"].get_array().value) {
                            if (item.type() == bsoncxx::type::k_string) {
                                product.attributes.voiceActors.push_back(std::string(item.get_string().value));
                            }
                        }
                    }
                }
                
                products.push_back(std::move(product));
            }
            
            if (products.empty()) break;
            
            // 转换为搜索文档并索引
            std::vector<ProductSearchDoc> docs;
            docs.reserve(products.size());
            for (const auto& p : products) {
                docs.push_back(convertToSearchDoc(p));
            }
            
            auto indexResult = ProductSearchService::bulkIndexProducts(docs);
            if (!indexResult) {
                result.failed += static_cast<int>(products.size());
            } else {
                result.indexed += static_cast<int>(products.size());
            }
            
            processed += static_cast<int>(products.size());
            lastId = products.back().productId;
            
            if (onProgress) {
                (*onProgress)(processed, result.total);
            }
        }
        
    } catch (const std::exception& e) {
        return std::unexpected(std::string("Sync failed: ") + e.what());
    }
#else
    return std::unexpected("MongoDB support not compiled");
#endif
    
    return result;
}

SearchResult<void> ProductSyncService::syncProductsByIds(
    const std::vector<std::string>& productIds
) {
#ifdef HAVE_MONGODB
    try {
        if (!MongoConnection::instance().isConnected()) {
            return std::unexpected("MongoDB not connected");
        }
        
        auto db = MongoConnection::instance().database("suruga_ya");
        auto collection = db["products"];
        
        // 构建 $in 查询
        bsoncxx::builder::basic::array idsArray;
        for (const auto& id : productIds) {
            idsArray.append(id);
        }
        
        auto filter = make_document(kvp("product_id", make_document(kvp("$in", idsArray.view()))));
        auto cursor = collection.find(filter.view());
        
        std::vector<ProductSearchDoc> docs;
        for (auto&& doc : cursor) {
            Product product;
            if (doc["product_id"]) {
                product.productId = std::string(doc["product_id"].get_string().value);
            }
            if (doc["title"]) {
                product.title = std::string(doc["title"].get_string().value);
            }
            // ... 其他字段解析（简化处理）
            
            docs.push_back(convertToSearchDoc(product));
        }
        
        if (!docs.empty()) {
            return ProductSearchService::bulkIndexProducts(docs);
        }
        
    } catch (const std::exception& e) {
        return std::unexpected(std::string("Sync by IDs failed: ") + e.what());
    }
#else
    return std::unexpected("MongoDB support not compiled");
#endif
    
    return {};
}

SearchResult<void> ProductSyncService::syncSingleProduct(const std::string& productId) {
#ifdef HAVE_MONGODB
    try {
        if (!MongoConnection::instance().isConnected()) {
            return std::unexpected("MongoDB not connected");
        }
        
        auto db = MongoConnection::instance().database("suruga_ya");
        auto collection = db["products"];
        
        auto filter = make_document(kvp("product_id", productId));
        auto doc = collection.find_one(filter.view());
        
        if (!doc) {
            return std::unexpected("Product not found: " + productId);
        }
        
        Product product;
        auto view = doc->view();
        if (view["product_id"]) {
            product.productId = std::string(view["product_id"].get_string().value);
        }
        if (view["title"]) {
            product.title = std::string(view["title"].get_string().value);
        }
        if (view["url"]) {
            product.url = std::string(view["url"].get_string().value);
        }
        // ... 其他字段解析
        
        auto searchDoc = convertToSearchDoc(product);
        return ProductSearchService::indexProduct(searchDoc);
        
    } catch (const std::exception& e) {
        return std::unexpected(std::string("Sync single product failed: ") + e.what());
    }
#else
    return std::unexpected("MongoDB support not compiled");
#endif
}

SearchResult<SyncResult> ProductSyncService::rebuildIndex(
    std::optional<SyncProgressCallback> onProgress
) {
    // 删除索引
    auto deleteResult = ProductSearchService::deleteIndex();
    if (!deleteResult) {
        return std::unexpected("Failed to delete index: " + deleteResult.error());
    }
    
    // 重新创建索引
    auto setupResult = ProductSearchService::setupIndex();
    if (!setupResult) {
        return std::unexpected("Failed to setup index: " + setupResult.error());
    }
    
    // 全量同步
    return syncAllProducts(onProgress);
}

SearchResult<LinkVolumesResult> ProductSyncService::linkVolumesToProducts() {
    LinkVolumesResult result;
    
#ifdef HAVE_MONGODB
    try {
        if (!MongoConnection::instance().isConnected()) {
            return std::unexpected("MongoDB not connected");
        }
        
        auto bddbDb = MongoConnection::instance().database(resolveBddbDbName());
        auto volumesColl = bddbDb["bddb_volumes"];
        
        auto surugaDb = MongoConnection::instance().database("suruga_ya");
        auto productsColl = surugaDb["products"];
        
        // 获取所有未删除的卷
        auto volumes = volumesColl.find(make_document(kvp("is_deleted", false)).view());
        
        for (auto&& volume : volumes) {
            if (!volume["catalog_no"]) continue;
            
            std::string catalogNo = std::string(volume["catalog_no"].get_string().value);
            if (catalogNo.empty()) continue;
            
            // 查询 products 集合中 attributes.型番 匹配 catalog_no 的产品
            auto productFilter = make_document(
                kvp("attributes.型番", catalogNo)
            );
            auto cursor = productsColl.find(productFilter.view());
            std::vector<bsoncxx::document::view> products;
            for (auto&& doc : cursor) {
                products.push_back(doc);
            }
            
            if (!products.empty()) {
                // 获取已存在的 product_ids (存储为字符串)
                std::unordered_set<std::string> existingIdSet;
                if (volume["product_ids"] && volume["product_ids"].type() == bsoncxx::type::k_array) {
                    for (auto&& id : volume["product_ids"].get_array().value) {
                        if (id.type() == bsoncxx::type::k_oid) {
                            existingIdSet.insert(id.get_oid().value.to_string());
                        }
                    }
                }

                // 过滤出新的 product_ids
                std::vector<bsoncxx::oid> newProductIds;
                std::vector<std::string> productIdStrs;
                std::vector<std::string> newIdStrs;

                for (auto&& product : products) {
                    auto oid = product["_id"].get_oid().value;
                    std::string oidStr = oid.to_string();
                    productIdStrs.push_back(oidStr);

                    if (!existingIdSet.contains(oidStr)) {
                        newProductIds.push_back(oid);
                        newIdStrs.push_back(oidStr);
                    }
                }
                
                if (!newProductIds.empty()) {
                    auto volumeId = volume["_id"].get_oid().value;
                    auto now = std::chrono::system_clock::now().time_since_epoch().count() / 1000000000;
                    
                    // 使用 $addToSet 添加不重复的 product_ids
                    bsoncxx::builder::basic::array idsArray;
                    for (auto&& id : newProductIds) {
                        idsArray.append(id);
                    }
                    
                    auto update = make_document(
                        kvp("$addToSet", make_document(kvp("product_ids", make_document(kvp("$each", idsArray.view()))))),
                        kvp("$set", make_document(kvp("updated_at", static_cast<int64_t>(now))))
                    );
                    
                    volumesColl.update_one(
                        make_document(kvp("_id", volumeId)).view(),
                        update.view()
                    );
                    
                    result.updated++;
                }
                
                result.matched += static_cast<int>(products.size());
                result.skipped += static_cast<int>(products.size()) - static_cast<int>(newProductIds.size());
                
                SyncDetail detail;
                detail.volumeId = volume["_id"].get_oid().value.to_string();
                detail.catalogNo = catalogNo;
                detail.productIds = std::move(productIdStrs);
                detail.newIds = std::move(newIdStrs);
                detail.count = static_cast<int>(newProductIds.size());
                result.details.push_back(std::move(detail));
            }
        }
        
    } catch (const std::exception& e) {
        return std::unexpected(std::string("Link volumes failed: ") + e.what());
    }
#else
    return std::unexpected("MongoDB support not compiled");
#endif
    
    return result;
}
