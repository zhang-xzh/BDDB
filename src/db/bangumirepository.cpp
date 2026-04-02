#include "db/bangumirepository.h"

#ifdef HAVE_MONGODB

#include "db/connection.h"
#include <mongocxx/collection.hpp>
#include <mongocxx/pipeline.hpp>
#include <bsoncxx/builder/basic/document.hpp>
#include <bsoncxx/builder/basic/kvp.hpp>
#include <bsoncxx/builder/basic/array.hpp>
#include <ranges>

using bsoncxx::builder::basic::kvp;
using bsoncxx::builder::basic::make_document;
using bsoncxx::builder::basic::make_array;

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

static int bsonValueToInt32(const bsoncxx::document::element &elem) {
    if (!elem) return 0;
    switch (elem.type()) {
        case bsoncxx::type::k_int32:
            return elem.get_int32().value;
        case bsoncxx::type::k_int64:
            return static_cast<int>(elem.get_int64().value);
        case bsoncxx::type::k_double:
            return static_cast<int>(elem.get_double().value);
        default:
            return 0;
    }
}

static double bsonValueToDouble(const bsoncxx::document::element &elem) {
    if (!elem) return 0.0;
    switch (elem.type()) {
        case bsoncxx::type::k_double:
            return elem.get_double().value;
        case bsoncxx::type::k_int32:
            return static_cast<double>(elem.get_int32().value);
        case bsoncxx::type::k_int64:
            return static_cast<double>(elem.get_int64().value);
        default:
            return 0.0;
    }
}

static BangumiSubjectDoc parseSubjectDoc(const bsoncxx::document::view &view) {
    BangumiSubjectDoc s;
    if (view["_id"]) s.id = bsonValueToInt32(view["_id"]);
    if (view["name"]) s.name = bsonValueToString(view["name"]);
    if (view["name_cn"]) s.nameCn = bsonValueToString(view["name_cn"]);
    if (view["type"]) s.type = bsonValueToInt32(view["type"]);
    if (view["summary"]) s.summary = bsonValueToString(view["summary"]);
    if (view["nsfw"] && view["nsfw"].type() == bsoncxx::type::k_bool)
        s.nsfw = view["nsfw"].get_bool().value;
    if (view["date"]) s.date = bsonValueToString(view["date"]);
    if (view["meta"] && view["meta"].type() == bsoncxx::type::k_document) {
        auto meta = view["meta"].get_document().value;
        if (meta["score"]) s.score = bsonValueToDouble(meta["score"]);
        if (meta["rank"]) s.rank = bsonValueToInt32(meta["rank"]);
        if (meta["score_details"] && meta["score_details"].type() == bsoncxx::type::k_document) {
            for (auto &&kv : meta["score_details"].get_document().value) {
                s.scoreDetails.emplace(std::string(kv.key()), bsonValueToInt32(kv));
            }
        }
        if (meta["favorite"] && meta["favorite"].type() == bsoncxx::type::k_document) {
            auto fav = meta["favorite"].get_document().value;
            if (fav["wish"]) s.wish = bsonValueToInt32(fav["wish"]);
            if (fav["done"]) s.collect = bsonValueToInt32(fav["done"]);
            if (fav["doing"]) s.doing = bsonValueToInt32(fav["doing"]);
            if (fav["on_hold"]) s.onHold = bsonValueToInt32(fav["on_hold"]);
            if (fav["dropped"]) s.dropped = bsonValueToInt32(fav["dropped"]);
        }
    }
    return s;
}

DbResult<BangumiSubjectDoc> BangumiRepository::getSubjectById(int subjectId) {
    try {
        if (!MongoConnection::instance().isConnected()) return BangumiSubjectDoc{};
        auto db = MongoConnection::instance().database("bangumi");
        auto coll = db["subjects"];
        auto filter = make_document(kvp("_id", subjectId));
        if (auto result = coll.find_one(filter.view()); result) {
            return parseSubjectDoc(result->view());
        }
        return BangumiSubjectDoc{};
    } catch (const std::exception &e) {
        return std::unexpected(std::string("getSubjectById failed: ") + e.what());
    }
}

DbResult<std::vector<BangumiStaffItem>> BangumiRepository::getSubjectStaff(int subjectId) {
    try {
        if (!MongoConnection::instance().isConnected()) return std::vector<BangumiStaffItem>{};
        auto db = MongoConnection::instance().database("bangumi");
        auto coll = db["subject_persons"];

        mongocxx::pipeline pipeline;
        pipeline.match(make_document(kvp("subject_id", subjectId)));
        pipeline.lookup(make_document(
            kvp("from", "persons"),
            kvp("localField", "person_id"),
            kvp("foreignField", "_id"),
            kvp("as", "person")
        ));
        pipeline.unwind(make_document(kvp("path", "$person")));
        pipeline.project(make_document(
            kvp("person_id", "$person._id"),
            kvp("name", "$person.name"),
            kvp("name_cn", "$person.infobox.fields.简体中文名"),
            kvp("position", "$position_info.cn"),
            kvp("url", make_document(kvp("$concat", make_array(
                std::string("https://bgm.tv/person/"),
                make_document(kvp("$toString", "$person._id"))
            ))))
        ));

        auto cursor = coll.aggregate(pipeline);
        std::vector<BangumiStaffItem> list;
        for (auto &&doc : cursor) {
            BangumiStaffItem item;
            if (auto elem = doc["person_id"]; elem) item.personId = bsonValueToInt32(elem);
            if (auto elem = doc["name"]; elem) item.name = bsonValueToString(elem);
            if (auto elem = doc["name_cn"]; elem) item.nameCn = bsonValueToString(elem);
            if (auto elem = doc["position"]; elem) item.position = bsonValueToString(elem);
            if (auto elem = doc["url"]; elem) item.url = bsonValueToString(elem);
            list.push_back(item);
        }
        return list;
    } catch (const std::exception &e) {
        return std::unexpected(std::string("getSubjectStaff failed: ") + e.what());
    }
}

DbResult<std::vector<BangumiCharacterItem>> BangumiRepository::getSubjectCharacters(int subjectId) {
    try {
        if (!MongoConnection::instance().isConnected()) return std::vector<BangumiCharacterItem>{};
        auto db = MongoConnection::instance().database("bangumi");
        auto coll = db["subject_characters"];

        mongocxx::pipeline pipeline;
        pipeline.match(make_document(kvp("subject_id", subjectId)));
        pipeline.lookup(make_document(
            kvp("from", "characters"),
            kvp("localField", "character_id"),
            kvp("foreignField", "_id"),
            kvp("as", "character")
        ));
        pipeline.unwind(make_document(kvp("path", "$character")));
        pipeline.project(make_document(
            kvp("character_id", "$character._id"),
            kvp("name", "$character.name"),
            kvp("name_cn", "$character.infobox.fields.简体中文名"),
            kvp("role_type", "$type"),
            kvp("order", "$order"),
            kvp("url", make_document(kvp("$concat", make_array(
                std::string("https://bgm.tv/character/"),
                make_document(kvp("$toString", "$character._id"))
            ))))
        ));
        pipeline.sort(make_document(kvp("order", 1)));

        auto cursor = coll.aggregate(pipeline);
        std::vector<BangumiCharacterItem> list;
        for (auto &&doc : cursor) {
            BangumiCharacterItem item;
            if (auto elem = doc["character_id"]; elem) item.characterId = bsonValueToInt32(elem);
            if (auto elem = doc["name"]; elem) item.name = bsonValueToString(elem);
            if (auto elem = doc["name_cn"]; elem) item.nameCn = bsonValueToString(elem);
            if (auto elem = doc["role_type"]; elem) item.roleType = bsonValueToInt32(elem);
            if (auto elem = doc["order"]; elem) item.order = bsonValueToInt32(elem);
            if (auto elem = doc["url"]; elem) item.url = bsonValueToString(elem);
            list.push_back(item);
        }
        return list;
    } catch (const std::exception &e) {
        return std::unexpected(std::string("getSubjectCharacters failed: ") + e.what());
    }
}

DbResult<std::vector<BangumiEpisodeDoc>> BangumiRepository::getSubjectEpisodes(int subjectId) {
    try {
        if (!MongoConnection::instance().isConnected()) return std::vector<BangumiEpisodeDoc>{};
        auto db = MongoConnection::instance().database("bangumi");
        auto coll = db["episodes"];

        mongocxx::options::find opts;
        opts.sort(make_document(kvp("sort", 1)));
        auto filter = make_document(kvp("subject_id", subjectId));
        auto cursor = coll.find(filter.view(), opts);
        std::vector<BangumiEpisodeDoc> list;
        for (auto &&doc : cursor) {
            BangumiEpisodeDoc e;
            if (auto elem = doc["_id"]; elem) e.id = bsonValueToInt32(elem);
            if (auto elem = doc["subject_id"]; elem) e.subjectId = bsonValueToInt32(elem);
            if (auto elem = doc["type"]; elem) e.type = bsonValueToInt32(elem);
            if (auto elem = doc["name"]; elem) e.name = bsonValueToString(elem);
            if (auto elem = doc["name_cn"]; elem) e.nameCn = bsonValueToString(elem);
            if (auto elem = doc["sort"]; elem) e.sort = bsonValueToInt32(elem);
            if (auto elem = doc["airdate"]; elem) e.airdate = bsonValueToString(elem);
            if (auto elem = doc["duration"]; elem) e.duration = bsonValueToString(elem);
            if (auto elem = doc["description"]; elem) e.description = bsonValueToString(elem);
            if (auto elem = doc["disc"]; elem) e.disc = bsonValueToInt32(elem);
            list.push_back(e);
        }
        return list;
    } catch (const std::exception &e) {
        return std::unexpected(std::string("getSubjectEpisodes failed: ") + e.what());
    }
}

DbResult<std::vector<BangumiSubjectRelationItem>> BangumiRepository::getSubjectRelations(int subjectId) {
    try {
        if (!MongoConnection::instance().isConnected()) return std::vector<BangumiSubjectRelationItem>{};
        auto db = MongoConnection::instance().database("bangumi");
        auto coll = db["subject_relations"];

        mongocxx::pipeline pipeline;
        pipeline.match(make_document(kvp("subject_id", subjectId)));
        pipeline.lookup(make_document(
            kvp("from", "subjects"),
            kvp("localField", "related_subject_id"),
            kvp("foreignField", "_id"),
            kvp("as", "related_subject")
        ));
        pipeline.unwind(make_document(kvp("path", "$related_subject")));
        pipeline.project(make_document(
            kvp("subject_id", "$related_subject._id"),
            kvp("name", "$related_subject.name"),
            kvp("name_cn", "$related_subject.name_cn"),
            kvp("relation_type", "$relation_info.cn"),
            kvp("url", make_document(kvp("$concat", make_array(
                std::string("https://bgm.tv/subject/"),
                make_document(kvp("$toString", "$related_subject._id"))
            ))))
        ));

        auto cursor = coll.aggregate(pipeline);
        std::vector<BangumiSubjectRelationItem> list;
        for (auto &&doc : cursor) {
            BangumiSubjectRelationItem item;
            if (auto elem = doc["subject_id"]; elem) item.subjectId = bsonValueToInt32(elem);
            if (auto elem = doc["name"]; elem) item.name = bsonValueToString(elem);
            if (auto elem = doc["name_cn"]; elem) item.nameCn = bsonValueToString(elem);
            if (auto elem = doc["relation_type"]; elem) item.relationType = bsonValueToString(elem);
            if (auto elem = doc["url"]; elem) item.url = bsonValueToString(elem);
            list.push_back(item);
        }
        return list;
    } catch (const std::exception &e) {
        return std::unexpected(std::string("getSubjectRelations failed: ") + e.what());
    }
}

DbResult<BangumiSubjectDetail> BangumiRepository::getSubjectDetail(int subjectId) {
    try {
        BangumiSubjectDetail detail;
        auto subject = getSubjectById(subjectId);
        if (!subject) return std::unexpected(subject.error());
        if (subject->id == 0) return detail;
        static_cast<BangumiSubjectDoc&>(detail) = *subject;

        auto staff = getSubjectStaff(subjectId);
        if (!staff) return std::unexpected(staff.error());
        detail.staff = std::move(*staff);

        auto chars = getSubjectCharacters(subjectId);
        if (!chars) return std::unexpected(chars.error());
        detail.characters = std::move(*chars);

        auto eps = getSubjectEpisodes(subjectId);
        if (!eps) return std::unexpected(eps.error());
        detail.episodes = std::move(*eps);

        auto rels = getSubjectRelations(subjectId);
        if (!rels) return std::unexpected(rels.error());
        detail.relations = std::move(*rels);

        return detail;
    } catch (const std::exception &e) {
        return std::unexpected(std::string("getSubjectDetail failed: ") + e.what());
    }
}

DbResult<std::vector<BangumiSubjectDoc>> BangumiRepository::getAllSubjects(int batchSize, int skip) {
    try {
        if (!MongoConnection::instance().isConnected()) return std::vector<BangumiSubjectDoc>{};
        auto db = MongoConnection::instance().database("bangumi");
        auto coll = db["subjects"];

        mongocxx::options::find opts;
        opts.skip(skip);
        opts.limit(batchSize);
        auto cursor = coll.find({}, opts);
        std::vector<BangumiSubjectDoc> results;
        for (auto&& doc : cursor) {
            results.push_back(parseSubjectDoc(doc));
        }
        return results;
    } catch (const std::exception &e) {
        return std::unexpected(std::string("getAllSubjects failed: ") + e.what());
    }
}

DbResult<int> BangumiRepository::getTotalSubjectsCount() {
    try {
        if (!MongoConnection::instance().isConnected()) return 0;
        auto db = MongoConnection::instance().database("bangumi");
        auto coll = db["subjects"];
        return static_cast<int>(coll.count_documents({}));
    } catch (const std::exception &e) {
        return std::unexpected(std::string("getTotalSubjectsCount failed: ") + e.what());
    }
}

#endif // HAVE_MONGODB
