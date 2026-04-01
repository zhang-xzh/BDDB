#include "db/surugayarepository.h"

#ifdef HAVE_MONGODB

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

        return coll.find(filter.view())
            | std::views::transform([](auto& doc) { return parseProduct(doc); })
            | std::ranges::to<std::vector>();
    } catch (const std::exception &e) {
        return std::unexpected(std::string("findProductsByCatalogNo failed: ") + e.what());
    }
}

#endif // HAVE_MONGODB
