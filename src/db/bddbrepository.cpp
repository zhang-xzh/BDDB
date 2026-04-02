#include "db/bddbrepository.h"
#include "db/connection.h"
#include "db/surugayarepository.h"
#include "db/bsonutils.h"

#include <mongocxx/client.hpp>
#include <mongocxx/instance.hpp>
#include <mongocxx/uri.hpp>
#include <bsoncxx/builder/basic/document.hpp>
#include <bsoncxx/builder/basic/kvp.hpp>
#include <bsoncxx/builder/basic/array.hpp>
#include <bsoncxx/json.hpp>
#include <bsoncxx/types.hpp>
#include <chrono>
#include <ranges>
#include <optional>
#include <functional>
#include <QHash>
#include <QSet>

using bsoncxx::builder::basic::kvp;
using bsoncxx::builder::basic::make_document;
using bsoncxx::builder::basic::make_array;

// ==================== Model Deserializers ====================

static BangumiImages parseBangumiImages(const bsoncxx::document::view &view) {
    BangumiImages img;
    if (view["large"]) img.large = BsonUtils::toQString(view["large"]);
    if (view["common"]) img.common = BsonUtils::toQString(view["common"]);
    if (view["medium"]) img.medium = BsonUtils::toQString(view["medium"]);
    if (view["small"]) img.small = BsonUtils::toQString(view["small"]);
    if (view["grid"]) img.grid = BsonUtils::toQString(view["grid"]);
    return img;
}

static BangumiRating parseBangumiRating(const bsoncxx::document::view &view) {
    BangumiRating r;
    if (view["score"]) r.score = BsonUtils::toReal(view["score"]);
    if (view["total"]) r.total = BsonUtils::toInt32(view["total"]);
    if (view["count"] && view["count"].type() == bsoncxx::type::k_document) {
        for (auto &&kv: view["count"].get_document().value) {
            r.count.insert(BsonUtils::toQString(kv.key()), BsonUtils::toInt32(kv));
        }
    }
    return r;
}

static BangumiCollection parseBangumiCollection(const bsoncxx::document::view &view) {
    BangumiCollection c;
    if (view["wish"]) c.wish = BsonUtils::toInt32(view["wish"]);
    if (view["collect"]) c.collect = BsonUtils::toInt32(view["collect"]);
    if (view["doing"]) c.doing = BsonUtils::toInt32(view["doing"]);
    if (view["on_hold"]) c.on_hold = BsonUtils::toInt32(view["on_hold"]);
    if (view["dropped"]) c.dropped = BsonUtils::toInt32(view["dropped"]);
    return c;
}

static BangumiCharacter parseBangumiCharacter(const bsoncxx::document::view &view) {
    BangumiCharacter c;
    if (view["id"]) c.id = BsonUtils::toInt32(view["id"]);
    if (view["url"]) c.url = BsonUtils::toQString(view["url"]);
    if (view["name"]) c.name = BsonUtils::toQString(view["name"]);
    if (view["name_cn"]) c.nameCn = BsonUtils::toQString(view["name_cn"]);
    if (view["role_name"]) c.roleName = BsonUtils::toQString(view["role_name"]);
    if (view["images"] && view["images"].type() == bsoncxx::type::k_document)
        c.images = parseBangumiImages(view["images"].get_document().value);
    return c;
}

static BangumiStaff parseBangumiStaff(const bsoncxx::document::view &view) {
    BangumiStaff s;
    if (view["id"]) s.id = BsonUtils::toInt32(view["id"]);
    if (view["url"]) s.url = BsonUtils::toQString(view["url"]);
    if (view["name"]) s.name = BsonUtils::toQString(view["name"]);
    if (view["name_cn"]) s.nameCn = BsonUtils::toQString(view["name_cn"]);
    if (view["jobs"] && view["jobs"].type() == bsoncxx::type::k_array) {
        for (auto &&item: view["jobs"].get_array().value) {
            if (item.type() == bsoncxx::type::k_string)
                s.jobs.push_back(BsonUtils::toQString(item.get_string().value));
        }
    }
    if (view["images"] && view["images"].type() == bsoncxx::type::k_document)
        s.images = parseBangumiImages(view["images"].get_document().value);
    return s;
}

static TorrentFile parseTorrentFile(const bsoncxx::document::view &view) {
    TorrentFile f;
    if (view["_id"]) f.id = BsonUtils::oidToQString(view["_id"].get_oid().value);
    if (view["name"]) f.name = BsonUtils::toQString(view["name"]);
    if (view["size"]) f.size = BsonUtils::toInt64(view["size"]);
    if (view["progress"]) f.progress = BsonUtils::toReal(view["progress"]);
    if (view["index"]) f.index = BsonUtils::toInt32(view["index"]);
    if (view["priority"]) f.priority = BsonUtils::toInt32(view["priority"]);
    if (view["is_seed"]) f.isSeed = BsonUtils::toBool(view["is_seed"]);
    if (view["availability"]) f.availability = BsonUtils::toReal(view["availability"]);
    if (view["piece_range"] && view["piece_range"].type() == bsoncxx::type::k_array) {
        f.pieceRange = BsonUtils::toInt32List(view["piece_range"]);
    }
    if (view["created_at"]) f.createdAt = BsonUtils::toInt64(view["created_at"]);
    if (view["updated_at"]) f.updatedAt = BsonUtils::toInt64(view["updated_at"]);
    return f;
}

static Torrent parseTorrent(const bsoncxx::document::view &view) {
    Torrent t;
    if (view["_id"]) t.id = BsonUtils::oidToQString(view["_id"].get_oid().value);
    if (view["hash"]) t.hash = BsonUtils::toQString(view["hash"]);
    if (view["name"]) t.name = BsonUtils::toQString(view["name"]);
    if (view["size"]) t.size = BsonUtils::toInt64(view["size"]);
    if (view["progress"]) t.progress = BsonUtils::toReal(view["progress"]);
    if (view["state"]) t.state = BsonUtils::toQString(view["state"]);
    if (view["added_on"]) t.addedOn = BsonUtils::toInt64(view["added_on"]);
    if (view["num_seeds"]) t.numSeeds = BsonUtils::toInt32(view["num_seeds"]);
    if (view["num_leechs"]) t.numLeechs = BsonUtils::toInt32(view["num_leechs"]);
    if (view["completion_on"]) t.completionOn = BsonUtils::toInt64(view["completion_on"]);
    if (view["save_path"]) t.savePath = BsonUtils::toQString(view["save_path"]);
    if (view["uploaded"]) t.uploaded = BsonUtils::toInt64(view["uploaded"]);
    if (view["downloaded"]) t.downloaded = BsonUtils::toInt64(view["downloaded"]);
    if (view["category"]) t.category = BsonUtils::toQString(view["category"]);
    if (view["tags"]) t.tags = BsonUtils::toQString(view["tags"]);
    if (view["content_path"]) t.contentPath = BsonUtils::toQString(view["content_path"]);
    if (view["download_path"]) t.downloadPath = BsonUtils::toQString(view["download_path"]);
    if (view["infohash_v1"]) t.infohashV1 = BsonUtils::toQString(view["infohash_v1"]);
    if (view["infohash_v2"]) t.infohashV2 = BsonUtils::toQString(view["infohash_v2"]);
    if (view["comment"]) t.comment = BsonUtils::toQString(view["comment"]);
    if (view["has_metadata"]) t.hasMetadata = BsonUtils::toBool(view["has_metadata"]);
    if (view["inactive_seeding_time_limit"]) t.inactiveSeedingTimeLimit = BsonUtils::toInt32(view["inactive_seeding_time_limit"]);
    if (view["max_inactive_seeding_time"]) t.maxInactiveSeedingTime = BsonUtils::toInt32(view["max_inactive_seeding_time"]);
    if (view["popularity"]) t.popularity = BsonUtils::toReal(view["popularity"]);
    if (view["private"]) t.isPrivate = BsonUtils::toBool(view["private"]);
    if (view["root_path"]) t.rootPath = BsonUtils::toQString(view["root_path"]);
    if (view["amount_left"]) t.amountLeft = BsonUtils::toInt64(view["amount_left"]);
    if (view["auto_tmm"]) t.autoTmm = BsonUtils::toBool(view["auto_tmm"]);
    if (view["availability"]) t.availability = BsonUtils::toReal(view["availability"]);
    if (view["completed"]) t.completed = BsonUtils::toInt64(view["completed"]);
    if (view["dl_limit"]) t.dlLimit = BsonUtils::toInt32(view["dl_limit"]);
    if (view["dlspeed"]) t.dlSpeed = BsonUtils::toInt64(view["dlspeed"]);
    if (view["downloaded_session"]) t.downloadedSession = BsonUtils::toInt64(view["downloaded_session"]);
    if (view["eta"]) t.eta = BsonUtils::toInt64(view["eta"]);
    if (view["f_l_piece_prio"]) t.fLPiecePrio = BsonUtils::toBool(view["f_l_piece_prio"]);
    if (view["force_start"]) t.forceStart = BsonUtils::toBool(view["force_start"]);
    if (view["last_activity"]) t.lastActivity = BsonUtils::toInt64(view["last_activity"]);
    if (view["magnet_uri"]) t.magnetUri = BsonUtils::toQString(view["magnet_uri"]);
    if (view["max_ratio"]) t.maxRatio = BsonUtils::toReal(view["max_ratio"]);
    if (view["max_seeding_time"]) t.maxSeedingTime = BsonUtils::toInt32(view["max_seeding_time"]);
    if (view["num_complete"]) t.numComplete = BsonUtils::toInt32(view["num_complete"]);
    if (view["num_incomplete"]) t.numIncomplete = BsonUtils::toInt32(view["num_incomplete"]);
    if (view["priority"]) t.priority = BsonUtils::toInt32(view["priority"]);
    if (view["ratio"]) t.ratio = BsonUtils::toReal(view["ratio"]);
    if (view["ratio_limit"]) t.ratioLimit = BsonUtils::toReal(view["ratio_limit"]);
    if (view["reannounce"]) t.reannounce = BsonUtils::toInt32(view["reannounce"]);
    if (view["seeding_time"]) t.seedingTime = BsonUtils::toInt64(view["seeding_time"]);
    if (view["seeding_time_limit"]) t.seedingTimeLimit = BsonUtils::toInt32(view["seeding_time_limit"]);
    if (view["seen_complete"]) t.seenComplete = BsonUtils::toInt64(view["seen_complete"]);
    if (view["seq_dl"]) t.seqDl = BsonUtils::toBool(view["seq_dl"]);
    if (view["super_seeding"]) t.superSeeding = BsonUtils::toBool(view["super_seeding"]);
    if (view["time_active"]) t.timeActive = BsonUtils::toInt64(view["time_active"]);
    if (view["total_size"]) t.totalSize = BsonUtils::toInt64(view["total_size"]);
    if (view["tracker"]) t.tracker = BsonUtils::toQString(view["tracker"]);
    if (view["trackers_count"]) t.trackersCount = BsonUtils::toInt32(view["trackers_count"]);
    if (view["up_limit"]) t.upLimit = BsonUtils::toInt32(view["up_limit"]);
    if (view["uploaded_session"]) t.uploadedSession = BsonUtils::toInt64(view["uploaded_session"]);
    if (view["upspeed"]) t.upSpeed = BsonUtils::toInt64(view["upspeed"]);
    if (view["is_deleted"]) t.isDeleted = BsonUtils::toBool(view["is_deleted"]);
    if (view["synced_at"]) t.syncedAt = BsonUtils::toInt64(view["synced_at"]);
    if (view["created_at"]) t.createdAt = BsonUtils::toInt64(view["created_at"]);
    if (view["updated_at"]) t.updatedAt = BsonUtils::toInt64(view["updated_at"]);
    if (view["files"] && view["files"].type() == bsoncxx::type::k_array) {
        for (auto &&item: view["files"].get_array().value) {
            if (item.type() == bsoncxx::type::k_document)
                t.files.push_back(parseTorrentFile(item.get_document().value));
        }
    }
    return t;
}

static Volume parseVolume(const bsoncxx::document::view &view) {
    Volume v;
    if (view["_id"]) v.id = BsonUtils::oidToQString(view["_id"].get_oid().value);
    if (view["torrent_id"]) v.torrentId = BsonUtils::oidToQString(view["torrent_id"].get_oid().value);
    if (view["volume_no"]) v.volumeNo = BsonUtils::toInt32(view["volume_no"]);
    if (view["catalog_no"]) v.catalogNo = BsonUtils::toQString(view["catalog_no"]);
    if (view["volume_name"]) v.volumeName = BsonUtils::toQString(view["volume_name"]);
    if (view["is_deleted"]) v.isDeleted = BsonUtils::toBool(view["is_deleted"]);
    if (view["created_at"]) v.createdAt = BsonUtils::toInt64(view["created_at"]);
    if (view["updated_at"]) v.updatedAt = BsonUtils::toInt64(view["updated_at"]);
    if (view["product_ids"]) v.productIds = BsonUtils::toStringList(view["product_ids"]);
    if (view["file_ids"]) v.fileIds = BsonUtils::toStringList(view["file_ids"]);
    if (view["work_ids"]) v.workIds = BsonUtils::toStringList(view["work_ids"]);
    return v;
}

static Media parseMedia(const bsoncxx::document::view &view) {
    Media m;
    if (view["_id"]) m.id = BsonUtils::oidToQString(view["_id"].get_oid().value);
    if (view["volume_id"]) m.volumeId = BsonUtils::oidToQString(view["volume_id"].get_oid().value);
    if (view["media_no"]) m.mediaNo = BsonUtils::toInt32(view["media_no"]);
    if (view["media_type"]) m.mediaType = mediaTypeFromString(BsonUtils::toQString(view["media_type"]));
    if (view["volume_no"]) m.volumeNo = BsonUtils::toInt32(view["volume_no"]);
    if (view["catalog_no"]) m.catalogNo = BsonUtils::toQString(view["catalog_no"]);
    if (view["content_title"]) m.contentTitle = BsonUtils::toQString(view["content_title"]);
    if (view["description"]) m.description = BsonUtils::toQString(view["description"]);
    if (view["is_deleted"]) m.isDeleted = BsonUtils::toBool(view["is_deleted"]);
    if (view["created_at"]) m.createdAt = BsonUtils::toInt64(view["created_at"]);
    if (view["updated_at"]) m.updatedAt = BsonUtils::toInt64(view["updated_at"]);
    if (view["file_ids"]) m.fileIds = BsonUtils::toStringList(view["file_ids"]);
    return m;
}

static Work parseWork(const bsoncxx::document::view &view) {
    Work w;
    if (view["_id"]) w.id = BsonUtils::oidToQString(view["_id"].get_oid().value);
    if (view["id"]) w.bangumiSubjectId = BsonUtils::toInt32(view["id"]);
    if (view["url"]) w.url = BsonUtils::toQString(view["url"]);
    if (view["type"]) w.type = BsonUtils::toInt32(view["type"]);
    if (view["name"]) w.name = BsonUtils::toQString(view["name"]);
    if (view["name_cn"]) w.nameCn = BsonUtils::toQString(view["name_cn"]);
    if (view["summary"]) w.summary = BsonUtils::toQString(view["summary"]);
    if (view["eps"]) w.eps = BsonUtils::toInt32(view["eps"]);
    if (view["air_date"]) w.airDate = BsonUtils::toQString(view["air_date"]);
    if (view["air_weekday"]) w.airWeekday = BsonUtils::toInt32(view["air_weekday"]);
    if (view["images"] && view["images"].type() == bsoncxx::type::k_document)
        w.images = parseBangumiImages(view["images"].get_document().value);
    if (view["rating"] && view["rating"].type() == bsoncxx::type::k_document)
        w.rating = parseBangumiRating(view["rating"].get_document().value);
    if (view["rank"]) w.rank = BsonUtils::toInt32(view["rank"]);
    if (view["collection"] && view["collection"].type() == bsoncxx::type::k_document)
        w.collection = parseBangumiCollection(view["collection"].get_document().value);
    if (view["crt"] && view["crt"].type() == bsoncxx::type::k_array) {
        for (auto &&item: view["crt"].get_array().value) {
            if (item.type() == bsoncxx::type::k_document)
                w.characters.push_back(parseBangumiCharacter(item.get_document().value));
        }
    }
    if (view["staff"] && view["staff"].type() == bsoncxx::type::k_array) {
        for (auto &&item: view["staff"].get_array().value) {
            if (item.type() == bsoncxx::type::k_document)
                w.staff.push_back(parseBangumiStaff(item.get_document().value));
        }
    }
    if (view["created_at"]) w.createdAt = BsonUtils::toInt64(view["created_at"]);
    if (view["updated_at"]) w.updatedAt = BsonUtils::toInt64(view["updated_at"]);
    return w;
}

// ==================== Model Serializers ====================

static void serializeBangumiImages(bsoncxx::builder::basic::document &builder, const BangumiImages &img) {
    builder.append(kvp("large", img.large.toStdString()));
    builder.append(kvp("common", img.common.toStdString()));
    builder.append(kvp("medium", img.medium.toStdString()));
    builder.append(kvp("small", img.small.toStdString()));
    builder.append(kvp("grid", img.grid.toStdString()));
}

static void serializeBangumiRating(bsoncxx::builder::basic::document &builder, const BangumiRating &r) {
    builder.append(kvp("score", r.score));
    builder.append(kvp("total", r.total));
    bsoncxx::builder::basic::document countDoc;
    for (auto it = r.count.begin(); it != r.count.end(); ++it) {
        countDoc.append(kvp(it.key().toStdString(), it.value()));
    }
    builder.append(kvp("count", countDoc.extract()));
}

static void serializeBangumiCollection(bsoncxx::builder::basic::document &builder, const BangumiCollection &c) {
    builder.append(kvp("wish", c.wish));
    builder.append(kvp("collect", c.collect));
    builder.append(kvp("doing", c.doing));
    builder.append(kvp("on_hold", c.on_hold));
    builder.append(kvp("dropped", c.dropped));
}

static void serializeBangumiCharacter(bsoncxx::builder::basic::document &builder, const BangumiCharacter &c) {
    builder.append(kvp("id", c.id));
    builder.append(kvp("url", c.url.toStdString()));
    builder.append(kvp("name", c.name.toStdString()));
    builder.append(kvp("name_cn", c.nameCn.toStdString()));
    builder.append(kvp("role_name", c.roleName.toStdString()));
    bsoncxx::builder::basic::document imgDoc;
    serializeBangumiImages(imgDoc, c.images);
    builder.append(kvp("images", imgDoc.extract()));
}

static void serializeBangumiStaff(bsoncxx::builder::basic::document &builder, const BangumiStaff &s) {
    builder.append(kvp("id", s.id));
    builder.append(kvp("url", s.url.toStdString()));
    builder.append(kvp("name", s.name.toStdString()));
    builder.append(kvp("name_cn", s.nameCn.toStdString()));
    bsoncxx::builder::basic::array jobsArr;
    for (const auto &job: s.jobs) {
        jobsArr.append(job.toStdString());
    }
    builder.append(kvp("jobs", jobsArr.extract()));
    bsoncxx::builder::basic::document imgDoc;
    serializeBangumiImages(imgDoc, s.images);
    builder.append(kvp("images", imgDoc.extract()));
}

static bsoncxx::builder::basic::document torrentToBson(const Torrent &t) {
    bsoncxx::builder::basic::document builder{};
    if (!t.id.isEmpty()) builder.append(kvp("_id", BsonUtils::toOid(t.id)));
    builder.append(kvp("hash", t.hash.toStdString()));
    builder.append(kvp("name", t.name.toStdString()));
    builder.append(kvp("size", static_cast<qint64>(t.size)));
    builder.append(kvp("progress", t.progress));
    builder.append(kvp("state", t.state.toStdString()));
    builder.append(kvp("added_on", static_cast<qint64>(t.addedOn)));
    builder.append(kvp("num_seeds", t.numSeeds));
    builder.append(kvp("num_leechs", t.numLeechs));
    builder.append(kvp("completion_on", static_cast<qint64>(t.completionOn)));
    builder.append(kvp("save_path", t.savePath.toStdString()));
    builder.append(kvp("uploaded", static_cast<qint64>(t.uploaded)));
    builder.append(kvp("downloaded", static_cast<qint64>(t.downloaded)));
    builder.append(kvp("category", t.category.toStdString()));
    builder.append(kvp("tags", t.tags.toStdString()));
    builder.append(kvp("content_path", t.contentPath.toStdString()));
    builder.append(kvp("download_path", t.downloadPath.toStdString()));
    builder.append(kvp("infohash_v1", t.infohashV1.toStdString()));
    builder.append(kvp("infohash_v2", t.infohashV2.toStdString()));
    builder.append(kvp("comment", t.comment.toStdString()));
    builder.append(kvp("has_metadata", t.hasMetadata));
    builder.append(kvp("inactive_seeding_time_limit", t.inactiveSeedingTimeLimit));
    builder.append(kvp("max_inactive_seeding_time", t.maxInactiveSeedingTime));
    builder.append(kvp("popularity", t.popularity));
    builder.append(kvp("private", t.isPrivate));
    builder.append(kvp("root_path", t.rootPath.toStdString()));
    builder.append(kvp("amount_left", static_cast<qint64>(t.amountLeft)));
    builder.append(kvp("auto_tmm", t.autoTmm));
    builder.append(kvp("availability", t.availability));
    builder.append(kvp("completed", static_cast<qint64>(t.completed)));
    builder.append(kvp("dl_limit", t.dlLimit));
    builder.append(kvp("dlspeed", static_cast<qint64>(t.dlSpeed)));
    builder.append(kvp("downloaded_session", static_cast<qint64>(t.downloadedSession)));
    builder.append(kvp("eta", static_cast<qint64>(t.eta)));
    builder.append(kvp("f_l_piece_prio", t.fLPiecePrio));
    builder.append(kvp("force_start", t.forceStart));
    builder.append(kvp("last_activity", static_cast<qint64>(t.lastActivity)));
    builder.append(kvp("magnet_uri", t.magnetUri.toStdString()));
    builder.append(kvp("max_ratio", t.maxRatio));
    builder.append(kvp("max_seeding_time", t.maxSeedingTime));
    builder.append(kvp("num_complete", t.numComplete));
    builder.append(kvp("num_incomplete", t.numIncomplete));
    builder.append(kvp("priority", t.priority));
    builder.append(kvp("ratio", t.ratio));
    builder.append(kvp("ratio_limit", t.ratioLimit));
    builder.append(kvp("reannounce", t.reannounce));
    builder.append(kvp("seeding_time", static_cast<qint64>(t.seedingTime)));
    builder.append(kvp("seeding_time_limit", t.seedingTimeLimit));
    builder.append(kvp("seen_complete", static_cast<qint64>(t.seenComplete)));
    builder.append(kvp("seq_dl", t.seqDl));
    builder.append(kvp("super_seeding", t.superSeeding));
    builder.append(kvp("time_active", static_cast<qint64>(t.timeActive)));
    builder.append(kvp("total_size", static_cast<qint64>(t.totalSize)));
    builder.append(kvp("tracker", t.tracker.toStdString()));
    builder.append(kvp("trackers_count", t.trackersCount));
    builder.append(kvp("up_limit", t.upLimit));
    builder.append(kvp("uploaded_session", static_cast<qint64>(t.uploadedSession)));
    builder.append(kvp("upspeed", static_cast<qint64>(t.upSpeed)));
    builder.append(kvp("is_deleted", t.isDeleted));
    builder.append(kvp("synced_at", static_cast<qint64>(t.syncedAt)));
    builder.append(kvp("created_at", static_cast<qint64>(t.createdAt)));
    builder.append(kvp("updated_at", static_cast<qint64>(t.updatedAt)));

    bsoncxx::builder::basic::array fileArr{};
    for (const auto &f: t.files) {
        bsoncxx::builder::basic::document fdoc{};
        if (!f.id.isEmpty()) fdoc.append(kvp("_id", BsonUtils::toOid(f.id)));
        fdoc.append(kvp("name", f.name.toStdString()));
        fdoc.append(kvp("size", static_cast<qint64>(f.size)));
        fdoc.append(kvp("progress", f.progress));
        fdoc.append(kvp("index", f.index));
        fdoc.append(kvp("priority", f.priority));
        fdoc.append(kvp("is_seed", f.isSeed));
        fdoc.append(kvp("availability", f.availability));
        bsoncxx::builder::basic::array prArr{};
        for (qint32 v: f.pieceRange) prArr.append(v);
        fdoc.append(kvp("piece_range", prArr.extract()));
        fdoc.append(kvp("created_at", static_cast<qint64>(f.createdAt)));
        fdoc.append(kvp("updated_at", static_cast<qint64>(f.updatedAt)));
        fileArr.append(fdoc.extract());
    }
    builder.append(kvp("files", fileArr.extract()));
    return builder;
}

static bsoncxx::builder::basic::document volumeToBson(const Volume &v) {
    bsoncxx::builder::basic::document builder{};
    if (!v.id.isEmpty()) builder.append(kvp("_id", BsonUtils::toOid(v.id)));
    builder.append(kvp("torrent_id", BsonUtils::toOid(v.torrentId)));
    builder.append(kvp("volume_no", v.volumeNo));
    builder.append(kvp("catalog_no", v.catalogNo.toStdString()));
    builder.append(kvp("volume_name", v.volumeName.toStdString()));
    builder.append(kvp("is_deleted", v.isDeleted));
    builder.append(kvp("created_at", static_cast<qint64>(v.createdAt)));
    builder.append(kvp("updated_at", static_cast<qint64>(v.updatedAt)));
    BsonUtils::appendOidArray(builder, QStringLiteral("product_ids"), v.productIds);
    BsonUtils::appendOidArray(builder, QStringLiteral("file_ids"), v.fileIds);
    BsonUtils::appendOidArray(builder, QStringLiteral("work_ids"), v.workIds);
    return builder;
}

static bsoncxx::builder::basic::document mediaToBson(const Media &m) {
    bsoncxx::builder::basic::document builder{};
    if (!m.id.isEmpty()) builder.append(kvp("_id", BsonUtils::toOid(m.id)));
    builder.append(kvp("volume_id", BsonUtils::toOid(m.volumeId)));
    builder.append(kvp("media_no", m.mediaNo));
    builder.append(kvp("media_type", mediaTypeToString(m.mediaType).toStdString()));
    builder.append(kvp("volume_no", m.volumeNo));
    builder.append(kvp("catalog_no", m.catalogNo.toStdString()));
    builder.append(kvp("content_title", m.contentTitle.toStdString()));
    builder.append(kvp("description", m.description.toStdString()));
    builder.append(kvp("is_deleted", m.isDeleted));
    builder.append(kvp("created_at", static_cast<qint64>(m.createdAt)));
    builder.append(kvp("updated_at", static_cast<qint64>(m.updatedAt)));
    BsonUtils::appendOidArray(builder, QStringLiteral("file_ids"), m.fileIds);
    return builder;
}

static bsoncxx::builder::basic::document workToBson(const Work &w) {
    bsoncxx::builder::basic::document builder{};
    if (!w.id.isEmpty()) builder.append(kvp("_id", BsonUtils::toOid(w.id)));
    builder.append(kvp("id", w.bangumiSubjectId));
    builder.append(kvp("url", w.url.toStdString()));
    builder.append(kvp("type", w.type));
    builder.append(kvp("name", w.name.toStdString()));
    builder.append(kvp("name_cn", w.nameCn.toStdString()));
    builder.append(kvp("summary", w.summary.toStdString()));
    builder.append(kvp("eps", w.eps));
    builder.append(kvp("air_date", w.airDate.toStdString()));
    builder.append(kvp("air_weekday", w.airWeekday));

    bsoncxx::builder::basic::document imgDoc;
    serializeBangumiImages(imgDoc, w.images);
    builder.append(kvp("images", imgDoc.extract()));

    bsoncxx::builder::basic::document ratingDoc;
    serializeBangumiRating(ratingDoc, w.rating);
    builder.append(kvp("rating", ratingDoc.extract()));

    builder.append(kvp("rank", w.rank));

    bsoncxx::builder::basic::document collectionDoc;
    serializeBangumiCollection(collectionDoc, w.collection);
    builder.append(kvp("collection", collectionDoc.extract()));

    bsoncxx::builder::basic::array crtArr;
    for (const auto &c: w.characters) {
        bsoncxx::builder::basic::document cdoc;
        serializeBangumiCharacter(cdoc, c);
        crtArr.append(cdoc.extract());
    }
    builder.append(kvp("crt", crtArr.extract()));

    bsoncxx::builder::basic::array staffArr;
    for (const auto &s: w.staff) {
        bsoncxx::builder::basic::document sdoc;
        serializeBangumiStaff(sdoc, s);
        staffArr.append(sdoc.extract());
    }
    builder.append(kvp("staff", staffArr.extract()));

    builder.append(kvp("created_at", static_cast<qint64>(w.createdAt)));
    builder.append(kvp("updated_at", static_cast<qint64>(w.updatedAt)));
    return builder;
}

// ==================== BddbRepository ====================

// ==================== Torrents ====================

DbResult<QList<Torrent> > BddbRepository::loadTorrents(bool includeDeleted) {
    try {
        if (!MongoConnection::instance().isConnected()) return QList<Torrent>{};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_torrents"];
        mongocxx::options::find opts;
        opts.projection(make_document(kvp("files", 0)));

        auto cursor = includeDeleted
                          ? coll.find({}, opts)
                          : coll.find(make_document(kvp("is_deleted", false)).view(), opts);

        QList<Torrent> results;
        for (auto &&doc: cursor) {
            results.push_back(parseTorrent(doc));
        }
        return results;
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("loadTorrents failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<Torrent> BddbRepository::getTorrentByHash(const QString &hash) {
    try {
        if (!MongoConnection::instance().isConnected()) return Torrent{};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_torrents"];
        auto filter = make_document(kvp("hash", hash.toStdString()), kvp("is_deleted", false));
        if (auto result = coll.find_one(filter.view()); result) {
            return parseTorrent(result->view());
        }
        return Torrent{};
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("getTorrentByHash failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<Torrent> BddbRepository::getTorrentById(const QString &id) {
    try {
        if (!MongoConnection::instance().isConnected()) return Torrent{};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_torrents"];
        auto filter = make_document(kvp("_id", BsonUtils::toOid(id)));
        if (auto result = coll.find_one(filter.view()); result) {
            return parseTorrent(result->view());
        }
        return Torrent{};
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("getTorrentById failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<void> BddbRepository::upsertTorrent(const Torrent &torrent) {
    try {
        if (!MongoConnection::instance().isConnected()) return {};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_torrents"];
        auto filter = make_document(kvp("hash", torrent.hash.toStdString()));
        auto doc = torrentToBson(torrent);
        auto update = make_document(kvp("$set", doc.extract()));
        coll.update_one(filter.view(), update.view(), mongocxx::options::update{}.upsert(true));
        return {};
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("upsertTorrent failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<void> BddbRepository::softDeleteTorrent(const QString &hash) {
    try {
        if (!MongoConnection::instance().isConnected()) return {};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_torrents"];
        auto filter = make_document(kvp("hash", hash.toStdString()));
        auto now = std::chrono::duration_cast<std::chrono::seconds>(std::chrono::system_clock::now().time_since_epoch()).count();
        auto update = make_document(kvp("$set", make_document(
                                            kvp("is_deleted", true),
                                            kvp("synced_at", static_cast<qint64>(now)),
                                            kvp("updated_at", static_cast<qint64>(now))
                                        )));
        coll.update_one(filter.view(), update.view());
        return {};
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("softDeleteTorrent failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<QList<FileItem> > BddbRepository::getTorrentFilesAsFileItems(const QString &torrentId) {
    try {
        auto tResult = getTorrentById(torrentId);
        if (!tResult) return std::unexpected(tResult.error());
        QList<FileItem> list;
        for (const auto &f: tResult->files) {
            FileItem item;
            item.id = f.id;
            item.name = f.name;
            item.size = f.size;
            item.progress = f.progress;
            list.push_back(item);
        }
        return list;
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("getTorrentFilesAsFileItems failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<void> BddbRepository::saveTorrentFiles(const QString &torrentId, const QList<TorrentFile> &files) {
    try {
        if (!MongoConnection::instance().isConnected()) return {};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_torrents"];
        auto filter = make_document(kvp("_id", BsonUtils::toOid(torrentId)));
        auto existing = coll.find_one(filter.view());
        auto now = std::chrono::duration_cast<std::chrono::seconds>(std::chrono::system_clock::now().time_since_epoch()).count();

        QHash<QString, TorrentFile> existingMap;
        if (existing && existing->view()["files"] && existing->view()["files"].type() == bsoncxx::type::k_array) {
            for (auto &&item: existing->view()["files"].get_array().value) {
                if (item.type() == bsoncxx::type::k_document) {
                    auto f = parseTorrentFile(item.get_document().value);
                    existingMap.insert(f.name, f);
                }
            }
        }

        bsoncxx::builder::basic::array fileArr{};
        for (const auto &f: files) {
            auto it = existingMap.find(f.name);
            const auto &e = (it != existingMap.end()) ? it.value() : TorrentFile{};
            bsoncxx::builder::basic::document fdoc{};
            if (!e.id.isEmpty()) fdoc.append(kvp("_id", BsonUtils::toOid(e.id)));
            else if (!f.id.isEmpty()) fdoc.append(kvp("_id", BsonUtils::toOid(f.id)));
            else fdoc.append(kvp("_id", bsoncxx::oid()));
            fdoc.append(kvp("name", f.name.toStdString()));
            fdoc.append(kvp("size", static_cast<qint64>(f.size)));
            fdoc.append(kvp("progress", f.progress));
            fdoc.append(kvp("index", f.index));
            fdoc.append(kvp("priority", f.priority));
            fdoc.append(kvp("is_seed", f.isSeed));
            fdoc.append(kvp("availability", f.availability));
            bsoncxx::builder::basic::array prArr{};
            for (qint32 v: f.pieceRange) prArr.append(v);
            fdoc.append(kvp("piece_range", prArr.extract()));
            fdoc.append(kvp("created_at", static_cast<qint64>(e.createdAt ? e.createdAt : now)));
            fdoc.append(kvp("updated_at", static_cast<qint64>(now)));
            fileArr.append(fdoc.extract());
        }

        auto update = make_document(kvp("$set", make_document(
                                            kvp("files", fileArr.extract()),
                                            kvp("updated_at", static_cast<qint64>(now))
                                        )));
        coll.update_one(filter.view(), update.view());
        return {};
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("saveTorrentFiles failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<void> BddbRepository::softDeleteTorrentFiles(const QString &torrentId) {
    try {
        if (!MongoConnection::instance().isConnected()) return {};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_torrents"];
        auto filter = make_document(kvp("_id", BsonUtils::toOid(torrentId)));
        auto now = std::chrono::duration_cast<std::chrono::seconds>(std::chrono::system_clock::now().time_since_epoch()).count();
        auto update = make_document(kvp("$set", make_document(
                                            kvp("files", bsoncxx::builder::basic::array{}.extract()),
                                            kvp("updated_at", static_cast<qint64>(now))
                                        )));
        coll.update_one(filter.view(), update.view());
        return {};
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("softDeleteTorrentFiles failed: ") + QString::fromUtf8(e.what()));
    }
}

// ==================== Volumes ====================

DbResult<QList<Volume> > BddbRepository::loadVolumes(const QString &torrentId) {
    return getAllVolumes(torrentId);
}

DbResult<QList<Volume> > BddbRepository::getAllVolumes(const QString &torrentId) {
    try {
        if (!MongoConnection::instance().isConnected()) return QList<Volume>{};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_volumes"];
        mongocxx::options::find opts;
        opts.sort(make_document(kvp("volume_no", 1)));

        auto cursor = !torrentId.isEmpty()
                          ? coll.find(make_document(kvp("torrent_id", BsonUtils::toOid(torrentId)), kvp("is_deleted", false)).view(), opts)
                          : coll.find(make_document(kvp("is_deleted", false)).view(), opts);

        QList<Volume> results;
        for (auto &&doc: cursor) {
            results.push_back(parseVolume(doc));
        }
        return results;
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("getAllVolumes failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<Volume> BddbRepository::getVolumeById(const QString &volumeId) {
    try {
        if (!MongoConnection::instance().isConnected()) return Volume{};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_volumes"];
        auto filter = make_document(kvp("_id", BsonUtils::toOid(volumeId)), kvp("is_deleted", false));
        if (auto result = coll.find_one(filter.view()); result) {
            return parseVolume(result->view());
        }
        return Volume{};
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("getVolumeById failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<void> BddbRepository::saveVolume(const Volume &volume) {
    try {
        if (!MongoConnection::instance().isConnected()) return {};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_volumes"];
        auto now = std::chrono::duration_cast<std::chrono::seconds>(std::chrono::system_clock::now().time_since_epoch()).count();

        auto delFilter = make_document(
            kvp("torrent_id", BsonUtils::toOid(volume.torrentId)),
            kvp("volume_no", volume.volumeNo)
        );
        coll.delete_one(delFilter.view());

        auto doc = volumeToBson(volume);
        if (volume.createdAt == 0) {
            doc.append(kvp("created_at", static_cast<qint64>(now)));
        }
        doc.append(kvp("updated_at", static_cast<qint64>(now)));
        coll.insert_one(doc.extract());
        return {};
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("saveVolume failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<QMap<QString, qint32> > BddbRepository::getVolumeCounts() {
    try {
        if (!MongoConnection::instance().isConnected()) return QMap<QString, qint32>{};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_volumes"];
        mongocxx::pipeline pipeline;
        pipeline.match(make_document(kvp("is_deleted", false)));
        pipeline.group(make_document(
            kvp("_id", "$torrent_id"),
            kvp("count", make_document(kvp("$sum", 1)))
        ));

        auto cursor = coll.aggregate(pipeline);
        QMap<QString, qint32> counts;
        for (auto &&doc: cursor) {
            if (auto idElem = doc["_id"]; idElem) {
                auto [tid, count] = qMakePair(
                    BsonUtils::oidToQString(idElem.get_oid().value),
                    BsonUtils::toInt32(doc["count"])
                );
                counts.insert(tid, count);
            }
        }
        return counts;
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("getVolumeCounts failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<void> BddbRepository::deleteStaleVolumes(const QString &torrentId, const QList<qint32> &keepVolumeNos) {
    try {
        if (!MongoConnection::instance().isConnected()) return {};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_volumes"];
        auto now = std::chrono::duration_cast<std::chrono::seconds>(std::chrono::system_clock::now().time_since_epoch()).count();

        bsoncxx::builder::basic::document builder{};
        builder.append(kvp("torrent_id", BsonUtils::toOid(torrentId)));
        builder.append(kvp("is_deleted", false));
        if (!keepVolumeNos.isEmpty()) {
            bsoncxx::builder::basic::array arr{};
            for (qint32 n: keepVolumeNos) arr.append(n);
            builder.append(kvp("volume_no", make_document(kvp("$nin", arr.extract()))));
        }

        auto update = make_document(kvp("$set", make_document(
                                            kvp("is_deleted", true),
                                            kvp("updated_at", static_cast<qint64>(now))
                                        )));
        coll.update_many(builder.extract(), update.view());
        return {};
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("deleteStaleVolumes failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<QList<FileItem> > BddbRepository::getVolumeFilesAsFileItems(const QString &volumeId) {
    try {
        auto vResult = getVolumeById(volumeId);
        if (!vResult) return std::unexpected(vResult.error());
        if (vResult->id.isEmpty()) return QList<FileItem>{};
        auto tResult = getTorrentById(vResult->torrentId);
        if (!tResult) return std::unexpected(tResult.error());
        const QSet idSet(vResult->fileIds.begin(), vResult->fileIds.end());
        QList<FileItem> list;
        for (const auto &f: tResult->files) {
            if (idSet.contains(f.id)) {
                FileItem item;
                item.id = f.id;
                item.name = f.name;
                item.size = f.size;
                item.progress = f.progress;
                list.push_back(item);
            }
        }
        return list;
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("getVolumeFilesAsFileItems failed: ") + QString::fromUtf8(e.what()));
    }
}

// ==================== Medias ====================

DbResult<QList<Media> > BddbRepository::loadMedias(const QString &volumeId) {
    try {
        if (!MongoConnection::instance().isConnected()) return QList<Media>{};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_medias"];
        mongocxx::options::find opts;
        opts.sort(make_document(kvp("media_no", 1)));
        auto filter = make_document(kvp("volume_id", BsonUtils::toOid(volumeId)), kvp("is_deleted", false));

        auto cursor = coll.find(filter.view(), opts);
        QList<Media> results;
        for (auto &&doc: cursor) {
            results.push_back(parseMedia(doc));
        }
        return results;
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("loadMedias failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<QMap<QString, qint32> > BddbRepository::getMediaCountsByVolume() {
    try {
        if (!MongoConnection::instance().isConnected()) return QMap<QString, qint32>{};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_medias"];
        mongocxx::pipeline pipeline;
        pipeline.match(make_document(kvp("is_deleted", false)));
        pipeline.group(make_document(
            kvp("_id", "$volume_id"),
            kvp("count", make_document(kvp("$sum", 1)))
        ));

        auto cursor = coll.aggregate(pipeline);
        QMap<QString, qint32> counts;
        for (auto &&doc: cursor) {
            if (auto idElem = doc["_id"]; idElem) {
                auto [vid, count] = qMakePair(
                    BsonUtils::oidToQString(idElem.get_oid().value),
                    BsonUtils::toInt32(doc["count"])
                );
                counts.insert(vid, count);
            }
        }
        return counts;
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("getMediaCountsByVolume failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<void> BddbRepository::saveMedia(const Media &media) {
    try {
        if (!MongoConnection::instance().isConnected()) return {};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_medias"];
        auto now = std::chrono::duration_cast<std::chrono::seconds>(std::chrono::system_clock::now().time_since_epoch()).count();

        auto delFilter = make_document(
            kvp("volume_id", BsonUtils::toOid(media.volumeId)),
            kvp("media_no", media.mediaNo),
            kvp("media_type", mediaTypeToString(media.mediaType).toStdString())
        );
        coll.delete_one(delFilter.view());

        auto doc = mediaToBson(media);
        if (media.createdAt == 0) {
            doc.append(kvp("created_at", static_cast<qint64>(now)));
        }
        doc.append(kvp("updated_at", static_cast<qint64>(now)));
        coll.insert_one(doc.extract());
        return {};
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("saveMedia failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<void> BddbRepository::deleteStaleMedias(const QString &volumeId, const QList<QPair<qint32, MediaType> > &keepMedias) {
    try {
        if (!MongoConnection::instance().isConnected()) return {};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_medias"];
        auto now = std::chrono::duration_cast<std::chrono::seconds>(std::chrono::system_clock::now().time_since_epoch()).count();

        if (keepMedias.isEmpty()) {
            auto filter = make_document(kvp("volume_id", BsonUtils::toOid(volumeId)), kvp("is_deleted", false));
            auto update = make_document(kvp("$set", make_document(
                                                kvp("is_deleted", true),
                                                kvp("updated_at", static_cast<qint64>(now))
                                            )));
            coll.update_many(filter.view(), update.view());
            return {};
        }

        bsoncxx::builder::basic::array norArr{};
        for (const auto &p: keepMedias) {
            bsoncxx::builder::basic::document cond{};
            cond.append(kvp("media_no", p.first));
            cond.append(kvp("media_type", mediaTypeToString(p.second).toStdString()));
            norArr.append(cond.extract());
        }

        auto filter = make_document(
            kvp("volume_id", BsonUtils::toOid(volumeId)),
            kvp("is_deleted", false),
            kvp("$nor", norArr.extract())
        );
        auto update = make_document(kvp("$set", make_document(
                                            kvp("is_deleted", true),
                                            kvp("updated_at", static_cast<qint64>(now))
                                        )));
        coll.update_many(filter.view(), update.view());
        return {};
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("deleteStaleMedias failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<QMap<QString, qint32> > BddbRepository::getWorkCountsByVolume() {
    try {
        if (!MongoConnection::instance().isConnected()) return QMap<QString, qint32>{};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_volumes"];
        mongocxx::pipeline pipeline;
        pipeline.match(make_document(kvp("is_deleted", false)));
        pipeline.add_fields(make_document(
            kvp("work_ids", make_document(
                    kvp("$ifNull", make_array("$work_ids", make_array()))
                ))
        ));
        pipeline.add_fields(make_document(
            kvp("count", make_document(kvp("$size", "$work_ids")))
        ));
        auto cursor = coll.aggregate(pipeline);
        QMap<QString, qint32> counts;
        for (auto &&doc: cursor) {
            if (auto idElem = doc["_id"]; idElem) {
                auto [vid, count] = qMakePair(
                    BsonUtils::oidToQString(idElem.get_oid().value),
                    BsonUtils::toInt32(doc["count"])
                );
                counts.insert(vid, count);
            }
        }
        return counts;
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("getWorkCountsByVolume failed: ") + QString::fromUtf8(e.what()));
    }
}

// ==================== Works ====================

DbResult<QList<Work> > BddbRepository::loadWorks() {
    try {
        if (!MongoConnection::instance().isConnected()) return QList<Work>{};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_works"];

        auto cursor = coll.find({});
        QList<Work> results;
        for (auto &&doc: cursor) {
            results.push_back(parseWork(doc));
        }
        return results;
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("loadWorks failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<Work> BddbRepository::getWorkById(const QString &id) {
    try {
        if (!MongoConnection::instance().isConnected()) return Work{};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_works"];
        auto filter = make_document(kvp("_id", BsonUtils::toOid(id)));
        if (auto result = coll.find_one(filter.view()); result) {
            return parseWork(result->view());
        }
        return Work{};
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("getWorkById failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<Work> BddbRepository::getWorkByBangumiSubjectId(qint32 subjectId) {
    try {
        if (!MongoConnection::instance().isConnected()) return Work{};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_works"];
        auto filter = make_document(kvp("id", subjectId));
        if (auto result = coll.find_one(filter.view()); result) {
            return parseWork(result->view());
        }
        return Work{};
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("getWorkByBangumiSubjectId failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<void> BddbRepository::saveWork(const Work &work) {
    try {
        if (!MongoConnection::instance().isConnected()) return {};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_works"];
        auto now = std::chrono::duration_cast<std::chrono::seconds>(std::chrono::system_clock::now().time_since_epoch()).count();

        auto existingResult = getWorkByBangumiSubjectId(work.bangumiSubjectId);
        if (!existingResult) return std::unexpected(existingResult.error());
        auto doc = workToBson(work);
        if (existingResult->id.isEmpty()) {
            doc.append(kvp("created_at", static_cast<qint64>(now)));
        } else {
            doc.append(kvp("created_at", static_cast<qint64>(existingResult->createdAt)));
        }
        doc.append(kvp("updated_at", static_cast<qint64>(now)));

        if (!existingResult->id.isEmpty()) {
            auto filter = make_document(kvp("_id", BsonUtils::toOid(existingResult->id)));
            auto update = make_document(kvp("$set", doc.extract()));
            coll.update_one(filter.view(), update.view());
        } else {
            coll.insert_one(doc.extract());
        }
        return {};
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("saveWork failed: ") + QString::fromUtf8(e.what()));
    }
}

DbResult<void> BddbRepository::removeWorkFromVolume(const QString &volumeId, const QString &workId) {
    try {
        if (!MongoConnection::instance().isConnected()) return {};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_volumes"];
        auto now = std::chrono::duration_cast<std::chrono::seconds>(std::chrono::system_clock::now().time_since_epoch()).count();
        auto filter = make_document(kvp("_id", BsonUtils::toOid(volumeId)));
        auto update = make_document(kvp("$pull", make_document(
                                            kvp("work_ids", BsonUtils::toOid(workId))
                                        )), kvp("$set", make_document(
                                                    kvp("updated_at", static_cast<qint64>(now))
                                                )));
        coll.update_one(filter.view(), update.view());
        return {};
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("removeWorkFromVolume failed: ") + QString::fromUtf8(e.what()));
    }
}

// ==================== Pagination & Search ====================

DbResult<VolumeListResult> BddbRepository::getVolumesWithPagination(const VolumeListParams &params) {
    try {
        VolumeListResult result;
        result.page = params.page;
        result.pageSize = params.pageSize;
        if (!MongoConnection::instance().isConnected()) return result;

        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_volumes"];
        mongocxx::pipeline pipeline;

        bsoncxx::builder::basic::document matchStage{};
        matchStage.append(kvp("is_deleted", false));

        if (!params.searchCatalogNo.isEmpty()) {
            matchStage.append(kvp("catalog_no", make_document(
                                      kvp("$regex", params.searchCatalogNo.toStdString()),
                                      kvp("$options", "i")
                                  )));
        }
        if (!params.searchTitle.isEmpty()) {
            matchStage.append(kvp("volume_name", make_document(
                                      kvp("$regex", params.searchTitle.toStdString()),
                                      kvp("$options", "i")
                                  )));
        }
        if (params.useFilterHasWork) {
            if (params.filterHasWork) {
                matchStage.append(kvp("work_ids", make_document(
                                          kvp("$exists", true),
                                          kvp("$not", make_document(kvp("$size", 0)))
                                      )));
            } else {
                matchStage.append(kvp("$or", make_array(
                                          make_document(kvp("work_ids", make_document(kvp("$exists", false)))),
                                          make_document(kvp("work_ids", make_document(kvp("$size", 0))))
                                      )));
            }
        }

        pipeline.match(matchStage.extract());

        if (params.useFilterHasMedia) {
            pipeline.lookup(make_document(
                kvp("from", "bddb_medias"),
                kvp("localField", "_id"),
                kvp("foreignField", "volume_id"),
                kvp("as", "medias")
            ));
            pipeline.add_fields(make_document(
                kvp("mediaCount", make_document(kvp("$size", "$medias")))
            ));
            if (params.filterHasMedia) {
                pipeline.match(make_document(kvp("mediaCount", make_document(kvp("$gt", 0)))));
            } else {
                pipeline.match(make_document(kvp("mediaCount", make_document(kvp("$eq", 0)))));
            }
        }

        // Count total using a separate pipeline
        {
            mongocxx::pipeline countPipeline;
            countPipeline.match(matchStage.extract());
            if (params.useFilterHasMedia) {
                countPipeline.lookup(make_document(
                    kvp("from", "bddb_medias"),
                    kvp("localField", "_id"),
                    kvp("foreignField", "volume_id"),
                    kvp("as", "medias")
                ));
                countPipeline.add_fields(make_document(
                    kvp("mediaCount", make_document(kvp("$size", "$medias")))
                ));
                if (params.filterHasMedia) {
                    countPipeline.match(make_document(kvp("mediaCount", make_document(kvp("$gt", 0)))));
                } else {
                    countPipeline.match(make_document(kvp("mediaCount", make_document(kvp("$eq", 0)))));
                }
            }
            countPipeline.count("total");
            auto countCursor = coll.aggregate(countPipeline);
            for (auto &&doc: countCursor) {
                result.total = BsonUtils::toInt32(doc["total"]);
            }
        }

        pipeline.sort(make_document(kvp("catalog_no", 1)));
        pipeline.skip((params.page - 1) * params.pageSize);
        pipeline.limit(params.pageSize);

        auto cursor = coll.aggregate(pipeline);
        for (auto &&doc: cursor) {
            result.data.push_back(parseVolume(doc));
        }
        return result;
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("getVolumesWithPagination failed: ") + QString::fromUtf8(e.what()));
    }
}

// ==================== Product Linking ====================

DbResult<BddbRepository::LinkResult> BddbRepository::linkVolumesToProducts(
    std::optional<LinkProgressCallback> onProgress
) {
    try {
        LinkResult result;
        if (!MongoConnection::instance().isConnected()) return result;

        auto db = MongoConnection::instance().database("bddb_dev");
        auto volumesColl = db["bddb_volumes"];

        // 先获取总数
        auto countFilter = make_document(kvp("is_deleted", false));
        auto totalCount = volumesColl.count_documents(countFilter.view());
        qint32 processed = 0;

        auto filter = make_document(kvp("is_deleted", false));
        auto cursor = volumesColl.find(filter.view());

        for (auto &&doc: cursor) {
            ++processed;
            if (onProgress) {
                (*onProgress)(processed, static_cast<qint32>(totalCount), QStringLiteral("Processing volume ") + QString::number(processed));
            }
            Volume v = parseVolume(doc);
            auto catalogNo = v.catalogNo.trimmed();
            if (catalogNo.isEmpty()) continue;

            auto productsResult = SurugaYaRepository::findProductsByCatalogNo(catalogNo);
            if (!productsResult) continue;
            const auto &products = *productsResult;

            QList<QString> newIds;
            QSet<QString> existingSet(v.productIds.begin(), v.productIds.end());

            for (const auto &product: products) {
                result.matched++;
                if (!existingSet.contains(product.id)) {
                    newIds.push_back(product.id);
                } else {
                    result.skipped++;
                }
            }

            if (!newIds.isEmpty()) {
                auto now = std::chrono::duration_cast<std::chrono::seconds>(std::chrono::system_clock::now().time_since_epoch()).count();
                bsoncxx::builder::basic::array addArr{};
                for (const auto &nid: newIds) addArr.append(BsonUtils::toOid(nid));
                auto vFilter = make_document(kvp("_id", BsonUtils::toOid(v.id)));
                auto update = make_document(
                    kvp("$addToSet", make_document(kvp("product_ids", make_document(kvp("$each", addArr.extract()))))),
                    kvp("$set", make_document(kvp("updated_at", static_cast<qint64>(now))))
                );
                volumesColl.update_one(vFilter.view(), update.view());
                result.updated++;
            }
        }

        return result;
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("linkVolumesToProducts failed: ") + QString::fromUtf8(e.what()));
    }
}
