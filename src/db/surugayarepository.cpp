#include "db/surugayarepository.h"

#include "db/connection.h"
#include <mongocxx/collection.hpp>
#include <bsoncxx/builder/basic/document.hpp>
#include <bsoncxx/builder/basic/kvp.hpp>

#include "bsonutils.h"

using bsoncxx::builder::basic::kvp;
using bsoncxx::builder::basic::make_document;

static Product parseProduct(const bsoncxx::document::view &view) {
    Product p;
    if (view["_id"]) p.id = BsonUtils::oidToQString(view["_id"].get_oid().value);
    if (view["product_id"]) p.productId = BsonUtils::toQString(view["product_id"]);
    if (view["title"]) p.title = BsonUtils::toQString(view["title"]);
    if (view["url"]) p.url = BsonUtils::toQString(view["url"]);
    if (view["note_raw"]) p.noteRaw = BsonUtils::toQString(view["note_raw"]);
    if (view["attributes"] && view["attributes"].type() == bsoncxx::type::k_document) {
        const auto attr = view["attributes"].get_document().value;
        if (attr["型番"]) p.attributes.catalogNo = BsonUtils::toQString(attr["型番"]);
        if (attr["メーカー"]) p.attributes.manufacturer = BsonUtils::toQString(attr["メーカー"]);
        if (attr["発売日"]) p.attributes.releaseDate = BsonUtils::toQString(attr["発売日"]);
        if (attr["定価"]) p.attributes.price = BsonUtils::toQString(attr["定価"]);
        if (attr["シナリオ"]) p.attributes.scenario = BsonUtils::toQString(attr["シナリオ"]);
        if (attr["キャラクターデザイン"]) p.attributes.characterDesign = BsonUtils::toQString(attr["キャラクターデザイン"]);
        if (attr["音楽"]) p.attributes.music = BsonUtils::toQString(attr["音楽"]);
        if (attr["原画"] && attr["原画"].type() == bsoncxx::type::k_array) {
            for (auto &&item: attr["原画"].get_array().value) {
                if (item.type() == bsoncxx::type::k_string)
                    p.attributes.illustrators.push_back(BsonUtils::toQString(item.get_string().value));
            }
        }
        if (attr["声優"] && attr["声優"].type() == bsoncxx::type::k_array) {
            for (auto &&item: attr["声優"].get_array().value) {
                if (item.type() == bsoncxx::type::k_string)
                    p.attributes.voiceActors.push_back(BsonUtils::toQString(item.get_string().value));
            }
        }
        p.manufacturer = p.attributes.manufacturer;
        p.scenario = p.attributes.scenario;
        p.modelNumber = p.attributes.catalogNo;
        p.releaseDate = p.attributes.releaseDate;
        p.price = p.attributes.price;
        p.voiceActors = p.attributes.voiceActors;
        p.artists = p.attributes.illustrators;
    }
    if (view["images"] && view["images"].type() == bsoncxx::type::k_array) {
        for (auto &&item: view["images"].get_array().value) {
            if (item.type() == bsoncxx::type::k_string)
                p.images.push_back(BsonUtils::toQString(item.get_string().value));
        }
    }
    if (view["tracklist"] && view["tracklist"].type() == bsoncxx::type::k_array) {
        for (auto &&item: view["tracklist"].get_array().value) {
            if (item.type() == bsoncxx::type::k_document) {
                auto tdoc = item.get_document().value;
                TrackList tl;
                if (tdoc["disc"]) tl.disc = BsonUtils::toQString(tdoc["disc"]);
                if (tdoc["tracks"] && tdoc["tracks"].type() == bsoncxx::type::k_array) {
                    for (auto &&tr: tdoc["tracks"].get_array().value) {
                        if (tr.type() == bsoncxx::type::k_string)
                            tl.tracks.push_back(BsonUtils::toQString(tr.get_string().value));
                    }
                }
                p.tracklist.push_back(tl);
            }
        }
    }
    return p;
}

DbResult<QList<Product> > SurugaYaRepository::findProductsByCatalogNo(const QString &catalogNo) {
    try {
        if (!MongoConnection::instance().isConnected()) return QList<Product>{};
        const auto db = MongoConnection::instance().database("suruga_ya");
        auto coll = db["products"];
        const auto filter = make_document(kvp("attributes.型番", catalogNo.toStdString()));

        auto cursor = coll.find(filter.view());
        QList<Product> results;
        for (auto &&doc: cursor) {
            results.push_back(parseProduct(doc));
        }
        return results;
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("findProductsByCatalogNo failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<std::optional<Product> > SurugaYaRepository::findByProductId(const QString &productId) {
    try {
        if (!MongoConnection::instance().isConnected()) return std::nullopt;
        const auto db = MongoConnection::instance().database("suruga_ya");
        auto coll = db["products"];
        const auto filter = make_document(kvp("product_id", BsonUtils::toOid(productId)));

        auto doc = coll.find_one(filter.view());
        if (!doc) return std::nullopt;

        return parseProduct(doc->view());
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("findByProductId failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<std::optional<Product> > SurugaYaRepository::findById(const QString &id) {
    try {
        if (!MongoConnection::instance().isConnected()) return std::nullopt;
        const auto db = MongoConnection::instance().database("suruga_ya");
        auto coll = db["products"];

        bsoncxx::oid oid;
        try {
            oid = BsonUtils::toOid(id);
        } catch (...) {
            return std::unexpected(QStringLiteral("Invalid ObjectId: ") + id);
        }

        const auto filter = make_document(kvp("_id", oid));
        auto doc = coll.find_one(filter.view());
        if (!doc) return std::nullopt;

        return parseProduct(doc->view());
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("findById failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<PaginatedResult<Product> > SurugaYaRepository::findAll(const PaginationParams &params) {
    try {
        if (!MongoConnection::instance().isConnected()) {
            return PaginatedResult<Product>{};
        }
        auto db = MongoConnection::instance().database("suruga_ya");
        auto coll = db["products"];

        // 获取总数
        auto total = static_cast<qint32>(coll.count_documents({}));

        // 分页查询
        qint32 skip = (params.page - 1) * params.pageSize;
        mongocxx::options::find opts;
        opts.skip(skip);
        opts.limit(params.pageSize);
        auto cursor = coll.find({}, opts);

        QList<Product> products;
        for (auto &&doc: cursor) {
            products.push_back(parseProduct(doc));
        }

        PaginatedResult<Product> result;
        result.data = std::move(products);
        result.total = total;
        result.page = params.page;
        result.pageSize = params.pageSize;
        result.totalPages = (total + params.pageSize - 1) / params.pageSize;

        return result;
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("findAll failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<PaginatedResult<Product> > SurugaYaRepository::findByQuery(const ProductQueryOptions &options) {
    try {
        if (!MongoConnection::instance().isConnected()) {
            return PaginatedResult<Product>{};
        }
        auto db = MongoConnection::instance().database("suruga_ya");
        auto coll = db["products"];

        // 构建查询条件
        const bsoncxx::document::value filterDoc = [&]() {
            auto builder = bsoncxx::builder::basic::document{};
            if (options.catalogNo) {
                builder.append(kvp("attributes.型番", options.catalogNo->toStdString()));
            }
            if (options.title) {
                builder.append(kvp("title", make_document(kvp("$regex", options.title->toStdString()), kvp("$options", "i"))));
            }
            if (options.manufacturer) {
                builder.append(kvp("attributes.メーカー", options.manufacturer->toStdString()));
            }
            return builder.extract();
        }();

        // 获取总数
        qint32 total = 0;
        if (options.catalogNo || options.title || options.manufacturer) {
            total = static_cast<qint32>(coll.count_documents(filterDoc.view()));
        } else {
            total = static_cast<qint32>(coll.count_documents({}));
        }

        // 分页查询
        qint32 skip = (options.pagination.page - 1) * options.pagination.pageSize;
        mongocxx::options::find opts;
        opts.skip(skip);
        opts.limit(options.pagination.pageSize);

        QList<Product> products;
        if (options.catalogNo || options.title || options.manufacturer) {
            auto cursor = coll.find(filterDoc.view(), opts);
            for (auto &&doc: cursor) {
                products.push_back(parseProduct(doc));
            }
        } else {
            auto cursor = coll.find({}, opts);
            for (auto &&doc: cursor) {
                products.push_back(parseProduct(doc));
            }
        }

        PaginatedResult<Product> result;
        result.data = std::move(products);
        result.total = total;
        result.page = options.pagination.page;
        result.pageSize = options.pagination.pageSize;
        result.totalPages = (total + options.pagination.pageSize - 1) / options.pagination.pageSize;

        return result;
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("findByQuery failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<qint32> SurugaYaRepository::count() {
    try {
        if (!MongoConnection::instance().isConnected()) return 0;
        auto db = MongoConnection::instance().database("suruga_ya");
        auto coll = db["products"];
        return static_cast<qint32>(coll.count_documents({}));
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("count failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<QList<Product> > SurugaYaRepository::searchByTitle(const QString &keyword, qint32 limit) {
    try {
        if (!MongoConnection::instance().isConnected()) return QList<Product>{};
        auto db = MongoConnection::instance().database("suruga_ya");
        auto coll = db["products"];

        auto filter = make_document(
            kvp("title", make_document(kvp("$regex", keyword.toStdString()), kvp("$options", "i")))
        );

        mongocxx::options::find opts;
        opts.limit(limit);
        auto cursor = coll.find(filter.view(), opts);

        QList<Product> products;
        for (auto &&doc: cursor) {
            products.push_back(parseProduct(doc));
        }

        return products;
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("searchByTitle failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<QList<QString> > SurugaYaRepository::getAllManufacturers() {
    try {
        if (!MongoConnection::instance().isConnected()) return QList<QString>{};
        auto db = MongoConnection::instance().database("suruga_ya");
        auto coll = db["products"];

        mongocxx::pipeline pipeline;
        pipeline.group(make_document(
            kvp("_id", "$attributes.メーカー"),
            kvp("count", make_document(kvp("$sum", 1)))
        ));
        pipeline.match(make_document(kvp("_id", make_document(kvp("$ne", bsoncxx::types::b_null{})))));
        pipeline.sort(make_document(kvp("count", -1)));

        auto cursor = coll.aggregate(pipeline);

        QList<QString> manufacturers;
        for (auto &&doc: cursor) {
            if (doc["_id"]) {
                manufacturers.push_back(BsonUtils::toQString(doc["_id"]));
            }
        }

        return manufacturers;
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("getAllManufacturers failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<QList<Product> > SurugaYaRepository::findByManufacturer(
    const QString &manufacturer,
    const PaginationParams &params
) {
    try {
        if (!MongoConnection::instance().isConnected()) return QList<Product>{};
        auto db = MongoConnection::instance().database("suruga_ya");
        auto coll = db["products"];

        auto filter = make_document(kvp("attributes.メーカー", manufacturer.toStdString()));

        qint32 skip = (params.page - 1) * params.pageSize;
        mongocxx::options::find opts;
        opts.skip(skip);
        opts.limit(params.pageSize);
        auto cursor = coll.find(filter.view(), opts);

        QList<Product> products;
        for (auto &&doc: cursor) {
            products.push_back(parseProduct(doc));
        }

        return products;
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("findByManufacturer failed: ") + QString::fromUtf8(e.what()));
    }
}


