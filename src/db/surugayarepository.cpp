#include "db/surugayarepository.h"

#include "db/connection.h"
#include <mongocxx/collection.hpp>
#include <bsoncxx/builder/basic/document.hpp>
#include <bsoncxx/builder/basic/kvp.hpp>
#include <ranges>

using bsoncxx::builder::basic::kvp;
using bsoncxx::builder::basic::make_document;

static std::string bsonValueToString(const bsoncxx::document::element &elem) {
    if (!elem) return {};
    switch (elem.type()) {
        case bsoncxx::type::k_string:
            return std::string(elem.get_string().value);
        case bsoncxx::type::k_int32:
            return std::to_string(elem.get_int32().value);
        case bsoncxx::type::k_int64:
            return std::to_string(elem.get_int64().value);
        default:
            return {};
    }
}

static Product parseProduct(const bsoncxx::document::view &view) {
    Product p;
    if (view["_id"]) p.id = std::string(view["_id"].get_oid().value.to_string());
    if (view["product_id"]) p.productId = bsonValueToString(view["product_id"]);
    if (view["title"]) p.title = bsonValueToString(view["title"]);
    if (view["url"]) p.url = bsonValueToString(view["url"]);
    if (view["note_raw"]) p.noteRaw = bsonValueToString(view["note_raw"]);
    if (view["attributes"] && view["attributes"].type() == bsoncxx::type::k_document) {
        auto attr = view["attributes"].get_document().value;
        if (attr["型番"]) p.attributes.catalogNo = bsonValueToString(attr["型番"]);
        if (attr["メーカー"]) p.attributes.manufacturer = bsonValueToString(attr["メーカー"]);
        if (attr["発売日"]) p.attributes.releaseDate = bsonValueToString(attr["発売日"]);
        if (attr["定価"]) p.attributes.price = bsonValueToString(attr["定価"]);
        if (attr["シナリオ"]) p.attributes.scenario = bsonValueToString(attr["シナリオ"]);
        if (attr["キャラクターデザイン"]) p.attributes.characterDesign = bsonValueToString(attr["キャラクターデザイン"]);
        if (attr["音楽"]) p.attributes.music = bsonValueToString(attr["音楽"]);
        if (attr["原画"] && attr["原画"].type() == bsoncxx::type::k_array) {
            for (auto &&item : attr["原画"].get_array().value) {
                if (item.type() == bsoncxx::type::k_string)
                    p.attributes.illustrators.push_back(std::string(item.get_string().value));
            }
        }
        if (attr["声優"] && attr["声優"].type() == bsoncxx::type::k_array) {
            for (auto &&item : attr["声優"].get_array().value) {
                if (item.type() == bsoncxx::type::k_string)
                    p.attributes.voiceActors.push_back(std::string(item.get_string().value));
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
        for (auto &&item : view["images"].get_array().value) {
            if (item.type() == bsoncxx::type::k_string)
                p.images.push_back(std::string(item.get_string().value));
        }
    }
    if (view["tracklist"] && view["tracklist"].type() == bsoncxx::type::k_array) {
        for (auto &&item : view["tracklist"].get_array().value) {
            if (item.type() == bsoncxx::type::k_document) {
                auto tdoc = item.get_document().value;
                TrackList tl;
                if (tdoc["disc"]) tl.disc = bsonValueToString(tdoc["disc"]);
                if (tdoc["tracks"] && tdoc["tracks"].type() == bsoncxx::type::k_array) {
                    for (auto &&tr : tdoc["tracks"].get_array().value) {
                        if (tr.type() == bsoncxx::type::k_string)
                            tl.tracks.push_back(std::string(tr.get_string().value));
                    }
                }
                p.tracklist.push_back(tl);
            }
        }
    }
    return p;
}

DbResult<std::vector<Product>> SurugaYaRepository::findProductsByCatalogNo(const std::string &catalogNo) {
    try {
        if (!MongoConnection::instance().isConnected()) return std::vector<Product>{};
        auto db = MongoConnection::instance().database("suruga_ya");
        auto coll = db["products"];
        auto filter = make_document(kvp("attributes.型番", catalogNo));

        auto cursor = coll.find(filter.view());
        std::vector<Product> results;
        for (auto&& doc : cursor) {
            results.push_back(parseProduct(doc));
        }
        return results;
    } catch (const std::exception &e) {
        return std::unexpected(std::string("findProductsByCatalogNo failed: ") + e.what());
    }
}

DbResult<std::optional<Product>> SurugaYaRepository::findByProductId(const std::string &productId) {
    try {
        if (!MongoConnection::instance().isConnected()) return std::nullopt;
        auto db = MongoConnection::instance().database("suruga_ya");
        auto coll = db["products"];
        auto filter = make_document(kvp("product_id", productId));
        
        auto doc = coll.find_one(filter.view());
        if (!doc) return std::nullopt;
        
        return parseProduct(doc->view());
    } catch (const std::exception &e) {
        return std::unexpected(std::string("findByProductId failed: ") + e.what());
    }
}

DbResult<std::optional<Product>> SurugaYaRepository::findById(const std::string &id) {
    try {
        if (!MongoConnection::instance().isConnected()) return std::nullopt;
        auto db = MongoConnection::instance().database("suruga_ya");
        auto coll = db["products"];
        
        bsoncxx::oid oid;
        try {
            oid = bsoncxx::oid{id};
        } catch (...) {
            return std::unexpected("Invalid ObjectId: " + id);
        }
        
        auto filter = make_document(kvp("_id", oid));
        auto doc = coll.find_one(filter.view());
        if (!doc) return std::nullopt;
        
        return parseProduct(doc->view());
    } catch (const std::exception &e) {
        return std::unexpected(std::string("findById failed: ") + e.what());
    }
}

DbResult<PaginatedResult<Product>> SurugaYaRepository::findAll(const PaginationParams& params) {
    try {
        if (!MongoConnection::instance().isConnected()) {
            return PaginatedResult<Product>{};
        }
        auto db = MongoConnection::instance().database("suruga_ya");
        auto coll = db["products"];
        
        // 获取总数
        auto total = static_cast<int>(coll.count_documents({}));
        
        // 分页查询
        int skip = (params.page - 1) * params.pageSize;
        mongocxx::options::find opts;
        opts.skip(skip);
        opts.limit(params.pageSize);
        auto cursor = coll.find({}, opts);
        
        std::vector<Product> products;
        for (auto&& doc : cursor) {
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
        return std::unexpected(std::string("findAll failed: ") + e.what());
    }
}

DbResult<PaginatedResult<Product>> SurugaYaRepository::findByQuery(const ProductQueryOptions& options) {
    try {
        if (!MongoConnection::instance().isConnected()) {
            return PaginatedResult<Product>{};
        }
        auto db = MongoConnection::instance().database("suruga_ya");
        auto coll = db["products"];
        
        // 构建查询条件
        bsoncxx::document::value filterDoc = [&]() {
            auto builder = bsoncxx::builder::basic::document{};
            if (options.catalogNo) {
                builder.append(kvp("attributes.型番", *options.catalogNo));
            }
            if (options.title) {
                builder.append(kvp("title", make_document(kvp("$regex", *options.title), kvp("$options", "i"))));
            }
            if (options.manufacturer) {
                builder.append(kvp("attributes.メーカー", *options.manufacturer));
            }
            return builder.extract();
        }();

        // 获取总数
        int total = 0;
        if (options.catalogNo || options.title || options.manufacturer) {
            total = static_cast<int>(coll.count_documents(filterDoc.view()));
        } else {
            total = static_cast<int>(coll.count_documents({}));
        }

        // 分页查询
        int skip = (options.pagination.page - 1) * options.pagination.pageSize;
        mongocxx::options::find opts;
        opts.skip(skip);
        opts.limit(options.pagination.pageSize);

        std::vector<Product> products;
        if (options.catalogNo || options.title || options.manufacturer) {
            auto cursor = coll.find(filterDoc.view(), opts);
            for (auto&& doc : cursor) {
                products.push_back(parseProduct(doc));
            }
        } else {
            auto cursor = coll.find({}, opts);
            for (auto&& doc : cursor) {
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
        return std::unexpected(std::string("findByQuery failed: ") + e.what());
    }
}

DbResult<int> SurugaYaRepository::count() {
    try {
        if (!MongoConnection::instance().isConnected()) return 0;
        auto db = MongoConnection::instance().database("suruga_ya");
        auto coll = db["products"];
        return static_cast<int>(coll.count_documents({}));
    } catch (const std::exception &e) {
        return std::unexpected(std::string("count failed: ") + e.what());
    }
}

DbResult<std::vector<Product>> SurugaYaRepository::searchByTitle(const std::string& keyword, int limit) {
    try {
        if (!MongoConnection::instance().isConnected()) return std::vector<Product>{};
        auto db = MongoConnection::instance().database("suruga_ya");
        auto coll = db["products"];
        
        auto filter = make_document(
            kvp("title", make_document(kvp("$regex", keyword), kvp("$options", "i")))
        );
        
        mongocxx::options::find opts;
        opts.limit(limit);
        auto cursor = coll.find(filter.view(), opts);
        
        std::vector<Product> products;
        for (auto&& doc : cursor) {
            products.push_back(parseProduct(doc));
        }
        
        return products;
    } catch (const std::exception &e) {
        return std::unexpected(std::string("searchByTitle failed: ") + e.what());
    }
}

DbResult<std::vector<std::string>> SurugaYaRepository::getAllManufacturers() {
    try {
        if (!MongoConnection::instance().isConnected()) return std::vector<std::string>{};
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
        
        std::vector<std::string> manufacturers;
        for (auto&& doc : cursor) {
            if (doc["_id"]) {
                manufacturers.push_back(bsonValueToString(doc["_id"]));
            }
        }
        
        return manufacturers;
    } catch (const std::exception &e) {
        return std::unexpected(std::string("getAllManufacturers failed: ") + e.what());
    }
}

DbResult<std::vector<Product>> SurugaYaRepository::findByManufacturer(
    const std::string& manufacturer, 
    const PaginationParams& params
) {
    try {
        if (!MongoConnection::instance().isConnected()) return std::vector<Product>{};
        auto db = MongoConnection::instance().database("suruga_ya");
        auto coll = db["products"];
        
        auto filter = make_document(kvp("attributes.メーカー", manufacturer));
        
        int skip = (params.page - 1) * params.pageSize;
        mongocxx::options::find opts;
        opts.skip(skip);
        opts.limit(params.pageSize);
        auto cursor = coll.find(filter.view(), opts);
        
        std::vector<Product> products;
        for (auto&& doc : cursor) {
            products.push_back(parseProduct(doc));
        }
        
        return products;
    } catch (const std::exception &e) {
        return std::unexpected(std::string("findByManufacturer failed: ") + e.what());
    }
}


