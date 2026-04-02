#include "db/bangumirepository.h"

#include "db/connection.h"
#include <mongocxx/collection.hpp>
#include <mongocxx/pipeline.hpp>
#include <bsoncxx/builder/basic/document.hpp>
#include <bsoncxx/builder/basic/kvp.hpp>
#include <bsoncxx/builder/basic/array.hpp>

#include "bsonutils.h"

using bsoncxx::builder::basic::kvp;
using bsoncxx::builder::basic::make_document;
using bsoncxx::builder::basic::make_array;

static BangumiSubjectDoc parseSubjectDoc(const bsoncxx::document::view &view) {
    BangumiSubjectDoc s;
    if (view["_id"]) s.id = BsonUtils::toInt32(view["_id"]);
    if (view["name"]) s.name = BsonUtils::toQString(view["name"]);
    if (view["name_cn"]) s.nameCn = BsonUtils::toQString(view["name_cn"]);
    if (view["type"]) s.type = BsonUtils::toInt32(view["type"]);
    if (view["summary"]) s.summary = BsonUtils::toQString(view["summary"]);
    if (view["nsfw"] && view["nsfw"].type() == bsoncxx::type::k_bool)
        s.nsfw = view["nsfw"].get_bool().value;
    if (view["date"]) s.date = BsonUtils::toQString(view["date"]);
    if (view["meta"] && view["meta"].type() == bsoncxx::type::k_document) {
        const auto meta = view["meta"].get_document().value;
        if (meta["score"]) s.score = BsonUtils::toReal(meta["score"]);
        if (meta["rank"]) s.rank = BsonUtils::toInt32(meta["rank"]);
        if (meta["score_details"] && meta["score_details"].type() == bsoncxx::type::k_document) {
            for (auto &&kv: meta["score_details"].get_document().value) {
                s.scoreDetails.insert(BsonUtils::toQString(kv.key()), BsonUtils::toInt32(kv));
            }
        }
        if (meta["favorite"] && meta["favorite"].type() == bsoncxx::type::k_document) {
            auto fav = meta["favorite"].get_document().value;
            if (fav["wish"]) s.wish = BsonUtils::toInt32(fav["wish"]);
            if (fav["done"]) s.collect = BsonUtils::toInt32(fav["done"]);
            if (fav["doing"]) s.doing = BsonUtils::toInt32(fav["doing"]);
            if (fav["on_hold"]) s.onHold = BsonUtils::toInt32(fav["on_hold"]);
            if (fav["dropped"]) s.dropped = BsonUtils::toInt32(fav["dropped"]);
        }
    }
    return s;
}

DbResult<BangumiSubjectDoc> BangumiRepository::getSubjectById(qint32 subjectId) {
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
        return std::unexpected(QStringLiteral("getSubjectById failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<QList<BangumiStaffItem> > BangumiRepository::getSubjectStaff(qint32 subjectId) {
    try {
        if (!MongoConnection::instance().isConnected()) return QList<BangumiStaffItem>{};
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
            kvp("url", make_document(kvp("$concat", make_array(QStringLiteral("https://bgm.tv/person/").toStdString(), make_document(kvp("$toString", "$person._id"))))))
        ));

        auto cursor = coll.aggregate(pipeline);
        QList<BangumiStaffItem> list;
        for (auto &&doc: cursor) {
            BangumiStaffItem item;
            if (auto elem = doc["person_id"]; elem) item.personId = BsonUtils::toInt32(elem);
            if (auto elem = doc["name"]; elem) item.name = BsonUtils::toQString(elem);
            if (auto elem = doc["name_cn"]; elem) item.nameCn = BsonUtils::toQString(elem);
            if (auto elem = doc["position"]; elem) item.position = BsonUtils::toQString(elem);
            if (auto elem = doc["url"]; elem) item.url = BsonUtils::toQString(elem);
            list.push_back(item);
        }
        return list;
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("getSubjectStaff failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<QList<BangumiCharacterItem> > BangumiRepository::getSubjectCharacters(qint32 subjectId) {
    try {
        if (!MongoConnection::instance().isConnected()) return QList<BangumiCharacterItem>{};
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
            kvp("url", make_document(kvp("$concat", make_array(QStringLiteral("https://bgm.tv/character/").toStdString(), make_document(kvp("$toString", "$character._id"))))))
        ));
        pipeline.sort(make_document(kvp("order", 1)));

        auto cursor = coll.aggregate(pipeline);
        QList<BangumiCharacterItem> list;
        for (auto &&doc: cursor) {
            BangumiCharacterItem item;
            if (auto elem = doc["character_id"]; elem) item.characterId = BsonUtils::toInt32(elem);
            if (auto elem = doc["name"]; elem) item.name = BsonUtils::toQString(elem);
            if (auto elem = doc["name_cn"]; elem) item.nameCn = BsonUtils::toQString(elem);
            if (auto elem = doc["role_type"]; elem) item.roleType = BsonUtils::toInt32(elem);
            if (auto elem = doc["order"]; elem) item.order = BsonUtils::toInt32(elem);
            if (auto elem = doc["url"]; elem) item.url = BsonUtils::toQString(elem);
            list.push_back(item);
        }
        return list;
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("getSubjectCharacters failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<QList<BangumiEpisodeDoc> > BangumiRepository::getSubjectEpisodes(qint32 subjectId) {
    try {
        if (!MongoConnection::instance().isConnected()) return QList<BangumiEpisodeDoc>{};
        auto db = MongoConnection::instance().database("bangumi");
        auto coll = db["episodes"];

        mongocxx::options::find opts;
        opts.sort(make_document(kvp("sort", 1)));
        auto filter = make_document(kvp("subject_id", subjectId));
        auto cursor = coll.find(filter.view(), opts);
        QList<BangumiEpisodeDoc> list;
        for (auto &&doc: cursor) {
            BangumiEpisodeDoc e;
            if (auto elem = doc["_id"]; elem) e.id = BsonUtils::toInt32(elem);
            if (auto elem = doc["subject_id"]; elem) e.subjectId = BsonUtils::toInt32(elem);
            if (auto elem = doc["type"]; elem) e.type = BsonUtils::toInt32(elem);
            if (auto elem = doc["name"]; elem) e.name = BsonUtils::toQString(elem);
            if (auto elem = doc["name_cn"]; elem) e.nameCn = BsonUtils::toQString(elem);
            if (auto elem = doc["sort"]; elem) e.sort = BsonUtils::toInt32(elem);
            if (auto elem = doc["airdate"]; elem) e.airdate = BsonUtils::toQString(elem);
            if (auto elem = doc["duration"]; elem) e.duration = BsonUtils::toQString(elem);
            if (auto elem = doc["description"]; elem) e.description = BsonUtils::toQString(elem);
            if (auto elem = doc["disc"]; elem) e.disc = BsonUtils::toInt32(elem);
            list.push_back(e);
        }
        return list;
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("getSubjectEpisodes failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<QList<BangumiSubjectRelationItem> > BangumiRepository::getSubjectRelations(qint32 subjectId) {
    try {
        if (!MongoConnection::instance().isConnected()) return QList<BangumiSubjectRelationItem>{};
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
                                             QStringLiteral("https://bgm.tv/subject/").toStdString(),
                                             make_document(kvp("$toString", "$related_subject._id"))
                                         ))))
        ));

        auto cursor = coll.aggregate(pipeline);
        QList<BangumiSubjectRelationItem> list;
        for (auto &&doc: cursor) {
            BangumiSubjectRelationItem item;
            if (auto elem = doc["subject_id"]; elem) item.subjectId = BsonUtils::toInt32(elem);
            if (auto elem = doc["name"]; elem) item.name = BsonUtils::toQString(elem);
            if (auto elem = doc["name_cn"]; elem) item.nameCn = BsonUtils::toQString(elem);
            if (auto elem = doc["relation_type"]; elem) item.relationType = BsonUtils::toQString(elem);
            if (auto elem = doc["url"]; elem) item.url = BsonUtils::toQString(elem);
            list.push_back(item);
        }
        return list;
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("getSubjectRelations failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<BangumiSubjectDetail> BangumiRepository::getSubjectDetail(qint32 subjectId) {
    try {
        BangumiSubjectDetail detail;
        auto subject = getSubjectById(subjectId);
        if (!subject) return std::unexpected(subject.error());
        if (subject->id == 0) return detail;
        static_cast<BangumiSubjectDoc &>(detail) = *subject;

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
        return std::unexpected(QStringLiteral("getSubjectDetail failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<QList<BangumiSubjectDoc> > BangumiRepository::getAllSubjects(qint32 batchSize, qint32 skip) {
    try {
        if (!MongoConnection::instance().isConnected()) return QList<BangumiSubjectDoc>{};
        auto db = MongoConnection::instance().database("bangumi");
        auto coll = db["subjects"];

        mongocxx::options::find opts;
        opts.skip(skip);
        opts.limit(batchSize);
        auto cursor = coll.find({}, opts);
        QList<BangumiSubjectDoc> results;
        for (auto &&doc: cursor) {
            results.push_back(parseSubjectDoc(doc));
        }
        return results;
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("getAllSubjects failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<qint32> BangumiRepository::getTotalSubjectsCount() {
    try {
        if (!MongoConnection::instance().isConnected()) return 0;
        auto db = MongoConnection::instance().database("bangumi");
        auto coll = db["subjects"];
        return static_cast<qint32>(coll.count_documents({}));
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("getTotalSubjectsCount failed: ") + QString::fromUtf8(e.what()));
    }
}
