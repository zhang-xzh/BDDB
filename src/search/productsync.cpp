#include "search/productsync.h"
#include "search/productsearch.h"
#include "db/surugayarepository.h"
#include "db/connection.h"

#include <mongocxx/collection.hpp>
#include <mongocxx/database.hpp>
#include <bsoncxx/builder/basic/document.hpp>
#include <bsoncxx/builder/basic/kvp.hpp>
#include <QSet>

using bsoncxx::builder::basic::kvp;
using bsoncxx::builder::basic::make_document;

ProductSearchDoc ProductSyncService::convertToSearchDoc(const Product &product) {
    return ProductSearchDoc::fromProduct(product);
}

SearchResult<SyncResult> ProductSyncService::syncAllProducts(
    std::optional<SyncProgressCallback> onProgress,
    qint32 batchSize
) {
    SyncResult result;

    try {
        if (!MongoConnection::instance().isConnected()) {
            return std::unexpected(QStringLiteral("MongoDB not connected"));
        }

        auto db = MongoConnection::instance().database(QStringLiteral("suruga_ya"));
        auto collection = db["products"];

        // 获取总数
        auto totalDoc = collection.count_documents({});
        result.total = static_cast<qint32>(totalDoc);

        if (result.total == 0) {
            return result;
        }

        // 清空现有索引
        auto clear = ProductSearchService::clearAllProducts();
        if (!clear) {
            return std::unexpected(QStringLiteral("Failed to clear index: ") + clear.error());
        }

        // 批量处理
        qint32 processed = 0;
        QString lastId;

        while (processed < result.total) {
            auto filter = make_document();
            if (!lastId.isEmpty()) {
                filter = make_document(kvp("product_id", make_document(kvp("$gt", lastId.toStdString()))));
            }

            mongocxx::options::find opts;
            opts.sort(make_document(kvp("product_id", 1)));
            opts.limit(batchSize);
            auto cursor = collection.find(filter.view(), opts);

            QList<Product> products;
            for (auto &&doc: cursor) {
                // 解析产品
                Product product;
                if (doc["product_id"]) {
                    product.productId = QString::fromUtf8(doc["product_id"].get_string().value.data(), 
                                                           static_cast<qsizetype>(doc["product_id"].get_string().value.size()));
                }
                if (doc["title"]) {
                    product.title = QString::fromUtf8(doc["title"].get_string().value.data(), 
                                                      static_cast<qsizetype>(doc["title"].get_string().value.size()));
                }
                if (doc["url"]) {
                    product.url = QString::fromUtf8(doc["url"].get_string().value.data(), 
                                                    static_cast<qsizetype>(doc["url"].get_string().value.size()));
                }
                if (doc["note_raw"]) {
                    product.noteRaw = QString::fromUtf8(doc["note_raw"].get_string().value.data(), 
                                                        static_cast<qsizetype>(doc["note_raw"].get_string().value.size()));
                }
                if (doc["images"] && doc["images"].type() == bsoncxx::type::k_array) {
                    for (auto &&item: doc["images"].get_array().value) {
                        if (item.type() == bsoncxx::type::k_string) {
                            product.images.push_back(QString::fromUtf8(item.get_string().value.data(), 
                                                                       static_cast<qsizetype>(item.get_string().value.size())));
                        }
                    }
                }
                if (doc["attributes"] && doc["attributes"].type() == bsoncxx::type::k_document) {
                    auto attr = doc["attributes"].get_document().value;
                    if (attr["型番"]) {
                        product.attributes.catalogNo = QString::fromUtf8(attr["型番"].get_string().value.data(), 
                                                                          static_cast<qsizetype>(attr["型番"].get_string().value.size()));
                    }
                    if (attr["メーカー"]) {
                        product.attributes.manufacturer = QString::fromUtf8(attr["メーカー"].get_string().value.data(), 
                                                                              static_cast<qsizetype>(attr["メーカー"].get_string().value.size()));
                    }
                    if (attr["発売日"]) {
                        product.attributes.releaseDate = QString::fromUtf8(attr["発売日"].get_string().value.data(), 
                                                                             static_cast<qsizetype>(attr["発売日"].get_string().value.size()));
                    }
                    if (attr["定価"]) {
                        product.attributes.price = QString::fromUtf8(attr["定価"].get_string().value.data(), 
                                                                       static_cast<qsizetype>(attr["定価"].get_string().value.size()));
                    }
                    if (attr["シナリオ"]) {
                        product.attributes.scenario = QString::fromUtf8(attr["シナリオ"].get_string().value.data(), 
                                                                          static_cast<qsizetype>(attr["シナリオ"].get_string().value.size()));
                    }
                    if (attr["原画"] && attr["原画"].type() == bsoncxx::type::k_array) {
                        for (auto &&item: attr["原画"].get_array().value) {
                            if (item.type() == bsoncxx::type::k_string) {
                                product.attributes.illustrators.push_back(QString::fromUtf8(item.get_string().value.data(), 
                                                                                            static_cast<qsizetype>(item.get_string().value.size())));
                            }
                        }
                    }
                    if (attr["声優"] && attr["声優"].type() == bsoncxx::type::k_array) {
                        for (auto &&item: attr["声優"].get_array().value) {
                            if (item.type() == bsoncxx::type::k_string) {
                                product.attributes.voiceActors.push_back(QString::fromUtf8(item.get_string().value.data(), 
                                                                                           static_cast<qsizetype>(item.get_string().value.size())));
                            }
                        }
                    }
                }

                products.push_back(std::move(product));
            }

            if (products.empty()) break;

            // 转换为搜索文档并索引
            QList<ProductSearchDoc> docs;
            docs.reserve(products.size());
            for (const auto &p: products) {
                docs.push_back(convertToSearchDoc(p));
            }

            auto indexResult = ProductSearchService::bulkIndexProducts(docs);
            if (!indexResult) {
                result.failed += static_cast<qint32>(products.size());
            } else {
                result.indexed += static_cast<qint32>(products.size());
            }

            processed += static_cast<qint32>(products.size());
            lastId = products.back().productId;

            if (onProgress) {
                (*onProgress)(processed, result.total);
            }
        }
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("Sync failed: ") + QString::fromUtf8(e.what()));
    }

    return result;
}

SearchResult<void> ProductSyncService::syncProductsByIds(
    const QList<QString> &productIds
) {
    try {
        if (!MongoConnection::instance().isConnected()) {
            return std::unexpected(QStringLiteral("MongoDB not connected"));
        }

        auto db = MongoConnection::instance().database(QStringLiteral("suruga_ya"));
        auto collection = db["products"];

        // 构建 $in 查询
        bsoncxx::builder::basic::array idsArray;
        for (const auto &id: productIds) {
            idsArray.append(id.toStdString());
        }

        auto filter = make_document(kvp("product_id", make_document(kvp("$in", idsArray.view()))));
        auto cursor = collection.find(filter.view());

        QList<ProductSearchDoc> docs;
        for (auto &&doc: cursor) {
            Product product;
            if (doc["product_id"]) {
                product.productId = QString::fromUtf8(doc["product_id"].get_string().value.data(), 
                                                      static_cast<qsizetype>(doc["product_id"].get_string().value.size()));
            }
            if (doc["title"]) {
                product.title = QString::fromUtf8(doc["title"].get_string().value.data(), 
                                                  static_cast<qsizetype>(doc["title"].get_string().value.size()));
            }
            // ... 其他字段解析（简化处理）

            docs.push_back(convertToSearchDoc(product));
        }

        if (!docs.empty()) {
            return ProductSearchService::bulkIndexProducts(docs);
        }
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("Sync by IDs failed: ") + QString::fromUtf8(e.what()));
    }

    return {};
}

SearchResult<void> ProductSyncService::syncSingleProduct(const QString &productId) {
    try {
        if (!MongoConnection::instance().isConnected()) {
            return std::unexpected(QStringLiteral("MongoDB not connected"));
        }

        auto db = MongoConnection::instance().database(QStringLiteral("suruga_ya"));
        auto collection = db["products"];

        auto filter = make_document(kvp("product_id", productId.toStdString()));
        auto doc = collection.find_one(filter.view());

        if (!doc) {
            return std::unexpected(QStringLiteral("Product not found: ") + productId);
        }

        Product product;
        auto view = doc->view();
        if (view["product_id"]) {
            product.productId = QString::fromUtf8(view["product_id"].get_string().value.data(), 
                                                  static_cast<qsizetype>(view["product_id"].get_string().value.size()));
        }
        if (view["title"]) {
            product.title = QString::fromUtf8(view["title"].get_string().value.data(), 
                                              static_cast<qsizetype>(view["title"].get_string().value.size()));
        }
        if (view["url"]) {
            product.url = QString::fromUtf8(view["url"].get_string().value.data(), 
                                            static_cast<qsizetype>(view["url"].get_string().value.size()));
        }
        // ... 其他字段解析

        auto searchDoc = convertToSearchDoc(product);
        return ProductSearchService::indexProduct(searchDoc);
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("Sync single product failed: ") + QString::fromUtf8(e.what()));
    }
}

SearchResult<SyncResult> ProductSyncService::rebuildIndex(
    std::optional<SyncProgressCallback> onProgress
) {
    // 删除索引
    auto deleteResult = ProductSearchService::deleteIndex();
    if (!deleteResult) {
        return std::unexpected(QStringLiteral("Failed to delete index: ") + deleteResult.error());
    }

    // 重新创建索引
    auto setupResult = ProductSearchService::setupIndex();
    if (!setupResult) {
        return std::unexpected(QStringLiteral("Failed to setup index: ") + setupResult.error());
    }

    // 全量同步
    return syncAllProducts(onProgress);
}
