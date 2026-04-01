#include "db/bangumirepository.h"

#ifdef HAVE_MONGODB

#include "db/connection.h"
#include <mongocxx/collection.hpp>
#include <mongocxx/pipeline.hpp>
#include <bsoncxx/builder/basic/document.hpp>
#include <bsoncxx/builder/basic/kvp.hpp>
#include <bsoncxx/builder/basic/array.hpp>

using bsoncxx::builder::basic::kvp;
using bsoncxx::builder::basic::make_document;
using bsoncxx::builder::basic::make_array;

static QString bsonValueToString(const bsoncxx::document::element &elem) {
    if (!elem) return QString();
    switch (elem.type()) {
        case bsoncxx::type::k_string:
            return QString::fromStdString(std::string(elem.get_string().value));
        case bsoncxx::type::k_int32:
            return QString::number(elem.get_int32().value);
        case bsoncxx::type::k_int64:
            return QString::number(elem.get_int64().value);
        default:
            return QString();
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
                s.scoreDetails.insert(QString::fromStdString(std::string(kv.key())), bsonValueToInt32(kv));
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

BangumiSubjectDoc BangumiRepository::getSubjectById(int subjectId) {
    BangumiSubjectDoc s;
    if (!MongoConnection::instance().isConnected()) return s;
    auto db = MongoConnection::instance().database(QStringLiteral("bangumi"));
    auto coll = db["subjects"];
    auto filter = make_document(kvp("_id", subjectId));
    auto result = coll.find_one(filter.view());
    if (result) s = parseSubjectDoc(result->view());
    return s;
}

QVector<BangumiStaffItem> BangumiRepository::getSubjectStaff(int subjectId) {
    QVector<BangumiStaffItem> list;
    if (!MongoConnection::instance().isConnected()) return list;
    auto db = MongoConnection::instance().database(QStringLiteral("bangumi"));
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
    for (auto &&doc : cursor) {
        BangumiStaffItem item;
        if (doc["person_id"]) item.personId = bsonValueToInt32(doc["person_id"]);
        if (doc["name"]) item.name = bsonValueToString(doc["name"]);
        if (doc["name_cn"]) item.nameCn = bsonValueToString(doc["name_cn"]);
        if (doc["position"]) item.position = bsonValueToString(doc["position"]);
        if (doc["url"]) item.url = bsonValueToString(doc["url"]);
        list.append(item);
    }
    return list;
}

QVector<BangumiCharacterItem> BangumiRepository::getSubjectCharacters(int subjectId) {
    QVector<BangumiCharacterItem> list;
    if (!MongoConnection::instance().isConnected()) return list;
    auto db = MongoConnection::instance().database(QStringLiteral("bangumi"));
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
    for (auto &&doc : cursor) {
        BangumiCharacterItem item;
        if (doc["character_id"]) item.characterId = bsonValueToInt32(doc["character_id"]);
        if (doc["name"]) item.name = bsonValueToString(doc["name"]);
        if (doc["name_cn"]) item.nameCn = bsonValueToString(doc["name_cn"]);
        if (doc["role_type"]) item.roleType = bsonValueToInt32(doc["role_type"]);
        if (doc["order"]) item.order = bsonValueToInt32(doc["order"]);
        if (doc["url"]) item.url = bsonValueToString(doc["url"]);
        list.append(item);
    }
    return list;
}

QVector<BangumiEpisodeDoc> BangumiRepository::getSubjectEpisodes(int subjectId) {
    QVector<BangumiEpisodeDoc> list;
    if (!MongoConnection::instance().isConnected()) return list;
    auto db = MongoConnection::instance().database(QStringLiteral("bangumi"));
    auto coll = db["episodes"];

    mongocxx::options::find opts;
    opts.sort(make_document(kvp("sort", 1)));
    auto filter = make_document(kvp("subject_id", subjectId));
    auto cursor = coll.find(filter.view(), opts);
    for (auto &&doc : cursor) {
        BangumiEpisodeDoc e;
        if (doc["_id"]) e.id = bsonValueToInt32(doc["_id"]);
        if (doc["subject_id"]) e.subjectId = bsonValueToInt32(doc["subject_id"]);
        if (doc["type"]) e.type = bsonValueToInt32(doc["type"]);
        if (doc["name"]) e.name = bsonValueToString(doc["name"]);
        if (doc["name_cn"]) e.nameCn = bsonValueToString(doc["name_cn"]);
        if (doc["sort"]) e.sort = bsonValueToInt32(doc["sort"]);
        if (doc["airdate"]) e.airdate = bsonValueToString(doc["airdate"]);
        if (doc["duration"]) e.duration = bsonValueToString(doc["duration"]);
        if (doc["description"]) e.description = bsonValueToString(doc["description"]);
        if (doc["disc"]) e.disc = bsonValueToInt32(doc["disc"]);
        list.append(e);
    }
    return list;
}

QVector<BangumiSubjectRelationItem> BangumiRepository::getSubjectRelations(int subjectId) {
    QVector<BangumiSubjectRelationItem> list;
    if (!MongoConnection::instance().isConnected()) return list;
    auto db = MongoConnection::instance().database(QStringLiteral("bangumi"));
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
    for (auto &&doc : cursor) {
        BangumiSubjectRelationItem item;
        if (doc["subject_id"]) item.subjectId = bsonValueToInt32(doc["subject_id"]);
        if (doc["name"]) item.name = bsonValueToString(doc["name"]);
        if (doc["name_cn"]) item.nameCn = bsonValueToString(doc["name_cn"]);
        if (doc["relation_type"]) item.relationType = bsonValueToString(doc["relation_type"]);
        if (doc["url"]) item.url = bsonValueToString(doc["url"]);
        list.append(item);
    }
    return list;
}

BangumiSubjectDetail BangumiRepository::getSubjectDetail(int subjectId) {
    BangumiSubjectDetail detail;
    auto subject = getSubjectById(subjectId);
    if (subject.id == 0) return detail;
    static_cast<BangumiSubjectDoc&>(detail) = subject;
    detail.staff = getSubjectStaff(subjectId);
    detail.characters = getSubjectCharacters(subjectId);
    detail.episodes = getSubjectEpisodes(subjectId);
    detail.relations = getSubjectRelations(subjectId);
    return detail;
}

QVector<BangumiSubjectDoc> BangumiRepository::getAllSubjects(int batchSize, int skip) {
    QVector<BangumiSubjectDoc> list;
    if (!MongoConnection::instance().isConnected()) return list;
    auto db = MongoConnection::instance().database(QStringLiteral("bangumi"));
    auto coll = db["subjects"];

    mongocxx::options::find opts;
    opts.skip(skip);
    opts.limit(batchSize);
    auto cursor = coll.find({}, opts);
    for (auto &&doc : cursor) {
        list.append(parseSubjectDoc(doc));
    }
    return list;
}

int BangumiRepository::getTotalSubjectsCount() {
    if (!MongoConnection::instance().isConnected()) return 0;
    auto db = MongoConnection::instance().database(QStringLiteral("bangumi"));
    auto coll = db["subjects"];
    return static_cast<int>(coll.count_documents({}));
}

#endif // HAVE_MONGODB
