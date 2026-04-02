#include "db/bddbrepository.h"
#include "db/connection.h"
#include "db/surugayarepository.h"

#include <mongocxx/client.hpp>
#include <mongocxx/instance.hpp>
#include <mongocxx/uri.hpp>
#include <bsoncxx/builder/basic/document.hpp>
#include <bsoncxx/builder/basic/kvp.hpp>
#include <bsoncxx/builder/basic/array.hpp>
#include <bsoncxx/json.hpp>
#include <bsoncxx/types.hpp>
#include <chrono>
#include <unordered_set>
#include <ranges>
#include <optional>
#include <functional>

using bsoncxx::builder::basic::kvp;
using bsoncxx::builder::basic::make_document;
using bsoncxx::builder::basic::make_array;

// ==================== BSON Helpers ====================

static std::string bsonValueToString(const bsoncxx::document::element &elem) {
    if (!elem) return {};
    switch (elem.type()) {
        case bsoncxx::type::k_string:
            return std::string(elem.get_string().value);
        case bsoncxx::type::k_int32:
            return std::to_string(elem.get_int32().value);
        case bsoncxx::type::k_int64:
            return std::to_string(elem.get_int64().value);
        case bsoncxx::type::k_double:
            return std::to_string(elem.get_double().value);
        default:
            return {};
    }
}

static std::int64_t bsonValueToInt64(const bsoncxx::document::element &elem) {
    if (!elem) return 0;
    switch (elem.type()) {
        case bsoncxx::type::k_int64:
            return static_cast<std::int64_t>(elem.get_int64().value);
        case bsoncxx::type::k_int32:
            return static_cast<std::int64_t>(elem.get_int32().value);
        case bsoncxx::type::k_double:
            return static_cast<std::int64_t>(elem.get_double().value);
        default:
            return 0;
    }
}

static int bsonValueToInt32(const bsoncxx::document::element &elem) {
    if (!elem) return 0;
    switch (elem.type()) {
        case bsoncxx::type::k_int32:
            return static_cast<int>(elem.get_int32().value);
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

static bool bsonValueToBool(const bsoncxx::document::element &elem) {
    if (!elem) return false;
    if (elem.type() == bsoncxx::type::k_bool)
        return elem.get_bool().value;
    return false;
}

static std::string bsonOidToString(const bsoncxx::document::element &elem) {
    if (!elem) return {};
    if (elem.type() == bsoncxx::type::k_oid)
        return elem.get_oid().value.to_string();
    return bsonValueToString(elem);
}

static bsoncxx::oid stringToOid(const std::string &id) {
    if (id.empty()) return bsoncxx::oid();
    try {
        return bsoncxx::oid(id);
    } catch (...) {
        return bsoncxx::oid();
    }
}

static std::vector<std::string> bsonArrayToStringVector(const bsoncxx::document::element &elem) {
    std::vector<std::string> vec;
    if (!elem || elem.type() != bsoncxx::type::k_array) return vec;
    for (auto &&item: elem.get_array().value) {
        if (item.type() == bsoncxx::type::k_oid)
            vec.push_back(item.get_oid().value.to_string());
        else if (item.type() == bsoncxx::type::k_string)
            vec.push_back(std::string(item.get_string().value));
    }
    return vec;
}

static std::vector<int> bsonArrayToIntVector(const bsoncxx::document::element &elem) {
    std::vector<int> vec;
    if (!elem || elem.type() != bsoncxx::type::k_array) return vec;
    for (auto &&item: elem.get_array().value) {
        if (item.type() == bsoncxx::type::k_int32)
            vec.push_back(static_cast<int>(item.get_int32().value));
        else if (item.type() == bsoncxx::type::k_int64)
            vec.push_back(static_cast<int>(item.get_int64().value));
    }
    return vec;
}

static void appendOidArray(bsoncxx::builder::basic::document &builder, const std::string &key, const std::vector<std::string> &vec) {
    bsoncxx::builder::basic::array arr;
    for (const auto &s: vec) {
        if (!s.empty()) {
            arr.append(stringToOid(s));
        }
    }
    builder.append(kvp(key, arr.extract()));
}

// ==================== Model Deserializers ====================

static BangumiImages parseBangumiImages(const bsoncxx::document::view &view) {
    BangumiImages img;
    if (view["large"]) img.large = bsonValueToString(view["large"]);
    if (view["common"]) img.common = bsonValueToString(view["common"]);
    if (view["medium"]) img.medium = bsonValueToString(view["medium"]);
    if (view["small"]) img.small = bsonValueToString(view["small"]);
    if (view["grid"]) img.grid = bsonValueToString(view["grid"]);
    return img;
}

static BangumiRating parseBangumiRating(const bsoncxx::document::view &view) {
    BangumiRating r;
    if (view["score"]) r.score = bsonValueToDouble(view["score"]);
    if (view["total"]) r.total = bsonValueToInt32(view["total"]);
    if (view["count"] && view["count"].type() == bsoncxx::type::k_document) {
        for (auto &&kv: view["count"].get_document().value) {
            r.count.emplace(std::string(kv.key()), bsonValueToInt32(kv));
        }
    }
    return r;
}

static BangumiCollection parseBangumiCollection(const bsoncxx::document::view &view) {
    BangumiCollection c;
    if (view["wish"]) c.wish = bsonValueToInt32(view["wish"]);
    if (view["collect"]) c.collect = bsonValueToInt32(view["collect"]);
    if (view["doing"]) c.doing = bsonValueToInt32(view["doing"]);
    if (view["on_hold"]) c.on_hold = bsonValueToInt32(view["on_hold"]);
    if (view["dropped"]) c.dropped = bsonValueToInt32(view["dropped"]);
    return c;
}

static BangumiCharacter parseBangumiCharacter(const bsoncxx::document::view &view) {
    BangumiCharacter c;
    if (view["id"]) c.id = bsonValueToInt32(view["id"]);
    if (view["url"]) c.url = bsonValueToString(view["url"]);
    if (view["name"]) c.name = bsonValueToString(view["name"]);
    if (view["name_cn"]) c.nameCn = bsonValueToString(view["name_cn"]);
    if (view["role_name"]) c.roleName = bsonValueToString(view["role_name"]);
    if (view["images"] && view["images"].type() == bsoncxx::type::k_document)
        c.images = parseBangumiImages(view["images"].get_document().value);
    return c;
}

static BangumiStaff parseBangumiStaff(const bsoncxx::document::view &view) {
    BangumiStaff s;
    if (view["id"]) s.id = bsonValueToInt32(view["id"]);
    if (view["url"]) s.url = bsonValueToString(view["url"]);
    if (view["name"]) s.name = bsonValueToString(view["name"]);
    if (view["name_cn"]) s.nameCn = bsonValueToString(view["name_cn"]);
    if (view["jobs"] && view["jobs"].type() == bsoncxx::type::k_array) {
        for (auto &&item: view["jobs"].get_array().value) {
            if (item.type() == bsoncxx::type::k_string)
                s.jobs.push_back(std::string(item.get_string().value));
        }
    }
    if (view["images"] && view["images"].type() == bsoncxx::type::k_document)
        s.images = parseBangumiImages(view["images"].get_document().value);
    return s;
}

static TorrentFile parseTorrentFile(const bsoncxx::document::view &view) {
    TorrentFile f;
    if (view["_id"]) f.id = bsonOidToString(view["_id"]);
    if (view["name"]) f.name = bsonValueToString(view["name"]);
    if (view["size"]) f.size = bsonValueToInt64(view["size"]);
    if (view["progress"]) f.progress = bsonValueToDouble(view["progress"]);
    if (view["index"]) f.index = bsonValueToInt32(view["index"]);
    if (view["priority"]) f.priority = bsonValueToInt32(view["priority"]);
    if (view["is_seed"]) f.isSeed = bsonValueToBool(view["is_seed"]);
    if (view["availability"]) f.availability = bsonValueToDouble(view["availability"]);
    if (view["piece_range"] && view["piece_range"].type() == bsoncxx::type::k_array) {
        f.pieceRange = bsonArrayToIntVector(view["piece_range"]);
    }
    if (view["created_at"]) f.createdAt = bsonValueToInt64(view["created_at"]);
    if (view["updated_at"]) f.updatedAt = bsonValueToInt64(view["updated_at"]);
    return f;
}

static Torrent parseTorrent(const bsoncxx::document::view &view) {
    Torrent t;
    if (view["_id"]) t.id = bsonOidToString(view["_id"]);
    if (view["hash"]) t.hash = bsonValueToString(view["hash"]);
    if (view["name"]) t.name = bsonValueToString(view["name"]);
    if (view["size"]) t.size = bsonValueToInt64(view["size"]);
    if (view["progress"]) t.progress = bsonValueToDouble(view["progress"]);
    if (view["state"]) t.state = bsonValueToString(view["state"]);
    if (view["added_on"]) t.addedOn = bsonValueToInt64(view["added_on"]);
    if (view["num_seeds"]) t.numSeeds = bsonValueToInt32(view["num_seeds"]);
    if (view["num_leechs"]) t.numLeechs = bsonValueToInt32(view["num_leechs"]);
    if (view["completion_on"]) t.completionOn = bsonValueToInt64(view["completion_on"]);
    if (view["save_path"]) t.savePath = bsonValueToString(view["save_path"]);
    if (view["uploaded"]) t.uploaded = bsonValueToInt64(view["uploaded"]);
    if (view["downloaded"]) t.downloaded = bsonValueToInt64(view["downloaded"]);
    if (view["category"]) t.category = bsonValueToString(view["category"]);
    if (view["tags"]) t.tags = bsonValueToString(view["tags"]);
    if (view["content_path"]) t.contentPath = bsonValueToString(view["content_path"]);
    if (view["download_path"]) t.downloadPath = bsonValueToString(view["download_path"]);
    if (view["infohash_v1"]) t.infohashV1 = bsonValueToString(view["infohash_v1"]);
    if (view["infohash_v2"]) t.infohashV2 = bsonValueToString(view["infohash_v2"]);
    if (view["comment"]) t.comment = bsonValueToString(view["comment"]);
    if (view["has_metadata"]) t.hasMetadata = bsonValueToBool(view["has_metadata"]);
    if (view["inactive_seeding_time_limit"]) t.inactiveSeedingTimeLimit = bsonValueToInt32(view["inactive_seeding_time_limit"]);
    if (view["max_inactive_seeding_time"]) t.maxInactiveSeedingTime = bsonValueToInt32(view["max_inactive_seeding_time"]);
    if (view["popularity"]) t.popularity = bsonValueToDouble(view["popularity"]);
    if (view["private"]) t.isPrivate = bsonValueToBool(view["private"]);
    if (view["root_path"]) t.rootPath = bsonValueToString(view["root_path"]);
    if (view["amount_left"]) t.amountLeft = bsonValueToInt64(view["amount_left"]);
    if (view["auto_tmm"]) t.autoTmm = bsonValueToBool(view["auto_tmm"]);
    if (view["availability"]) t.availability = bsonValueToDouble(view["availability"]);
    if (view["completed"]) t.completed = bsonValueToInt64(view["completed"]);
    if (view["dl_limit"]) t.dlLimit = bsonValueToInt32(view["dl_limit"]);
    if (view["dlspeed"]) t.dlSpeed = bsonValueToInt64(view["dlspeed"]);
    if (view["downloaded_session"]) t.downloadedSession = bsonValueToInt64(view["downloaded_session"]);
    if (view["eta"]) t.eta = bsonValueToInt64(view["eta"]);
    if (view["f_l_piece_prio"]) t.fLPiecePrio = bsonValueToBool(view["f_l_piece_prio"]);
    if (view["force_start"]) t.forceStart = bsonValueToBool(view["force_start"]);
    if (view["last_activity"]) t.lastActivity = bsonValueToInt64(view["last_activity"]);
    if (view["magnet_uri"]) t.magnetUri = bsonValueToString(view["magnet_uri"]);
    if (view["max_ratio"]) t.maxRatio = bsonValueToDouble(view["max_ratio"]);
    if (view["max_seeding_time"]) t.maxSeedingTime = bsonValueToInt32(view["max_seeding_time"]);
    if (view["num_complete"]) t.numComplete = bsonValueToInt32(view["num_complete"]);
    if (view["num_incomplete"]) t.numIncomplete = bsonValueToInt32(view["num_incomplete"]);
    if (view["priority"]) t.priority = bsonValueToInt32(view["priority"]);
    if (view["ratio"]) t.ratio = bsonValueToDouble(view["ratio"]);
    if (view["ratio_limit"]) t.ratioLimit = bsonValueToDouble(view["ratio_limit"]);
    if (view["reannounce"]) t.reannounce = bsonValueToInt32(view["reannounce"]);
    if (view["seeding_time"]) t.seedingTime = bsonValueToInt64(view["seeding_time"]);
    if (view["seeding_time_limit"]) t.seedingTimeLimit = bsonValueToInt32(view["seeding_time_limit"]);
    if (view["seen_complete"]) t.seenComplete = bsonValueToInt64(view["seen_complete"]);
    if (view["seq_dl"]) t.seqDl = bsonValueToBool(view["seq_dl"]);
    if (view["super_seeding"]) t.superSeeding = bsonValueToBool(view["super_seeding"]);
    if (view["time_active"]) t.timeActive = bsonValueToInt64(view["time_active"]);
    if (view["total_size"]) t.totalSize = bsonValueToInt64(view["total_size"]);
    if (view["tracker"]) t.tracker = bsonValueToString(view["tracker"]);
    if (view["trackers_count"]) t.trackersCount = bsonValueToInt32(view["trackers_count"]);
    if (view["up_limit"]) t.upLimit = bsonValueToInt32(view["up_limit"]);
    if (view["uploaded_session"]) t.uploadedSession = bsonValueToInt64(view["uploaded_session"]);
    if (view["upspeed"]) t.upSpeed = bsonValueToInt64(view["upspeed"]);
    if (view["is_deleted"]) t.isDeleted = bsonValueToBool(view["is_deleted"]);
    if (view["synced_at"]) t.syncedAt = bsonValueToInt64(view["synced_at"]);
    if (view["created_at"]) t.createdAt = bsonValueToInt64(view["created_at"]);
    if (view["updated_at"]) t.updatedAt = bsonValueToInt64(view["updated_at"]);
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
    if (view["_id"]) v.id = bsonOidToString(view["_id"]);
    if (view["torrent_id"]) v.torrentId = bsonOidToString(view["torrent_id"]);
    if (view["volume_no"]) v.volumeNo = bsonValueToInt32(view["volume_no"]);
    if (view["catalog_no"]) v.catalogNo = bsonValueToString(view["catalog_no"]);
    if (view["volume_name"]) v.volumeName = bsonValueToString(view["volume_name"]);
    if (view["is_deleted"]) v.isDeleted = bsonValueToBool(view["is_deleted"]);
    if (view["created_at"]) v.createdAt = bsonValueToInt64(view["created_at"]);
    if (view["updated_at"]) v.updatedAt = bsonValueToInt64(view["updated_at"]);
    if (view["product_ids"]) v.productIds = bsonArrayToStringVector(view["product_ids"]);
    if (view["file_ids"]) v.fileIds = bsonArrayToStringVector(view["file_ids"]);
    if (view["work_ids"]) v.workIds = bsonArrayToStringVector(view["work_ids"]);
    return v;
}

static Media parseMedia(const bsoncxx::document::view &view) {
    Media m;
    if (view["_id"]) m.id = bsonOidToString(view["_id"]);
    if (view["volume_id"]) m.volumeId = bsonOidToString(view["volume_id"]);
    if (view["media_no"]) m.mediaNo = bsonValueToInt32(view["media_no"]);
    if (view["media_type"]) m.mediaType = mediaTypeFromString(bsonValueToString(view["media_type"]));
    if (view["volume_no"]) m.volumeNo = bsonValueToInt32(view["volume_no"]);
    if (view["catalog_no"]) m.catalogNo = bsonValueToString(view["catalog_no"]);
    if (view["content_title"]) m.contentTitle = bsonValueToString(view["content_title"]);
    if (view["description"]) m.description = bsonValueToString(view["description"]);
    if (view["is_deleted"]) m.isDeleted = bsonValueToBool(view["is_deleted"]);
    if (view["created_at"]) m.createdAt = bsonValueToInt64(view["created_at"]);
    if (view["updated_at"]) m.updatedAt = bsonValueToInt64(view["updated_at"]);
    if (view["file_ids"]) m.fileIds = bsonArrayToStringVector(view["file_ids"]);
    return m;
}

static Work parseWork(const bsoncxx::document::view &view) {
    Work w;
    if (view["_id"]) w.id = bsonOidToString(view["_id"]);
    if (view["id"]) w.bangumiSubjectId = bsonValueToInt32(view["id"]);
    if (view["url"]) w.url = bsonValueToString(view["url"]);
    if (view["type"]) w.type = bsonValueToInt32(view["type"]);
    if (view["name"]) w.name = bsonValueToString(view["name"]);
    if (view["name_cn"]) w.nameCn = bsonValueToString(view["name_cn"]);
    if (view["summary"]) w.summary = bsonValueToString(view["summary"]);
    if (view["eps"]) w.eps = bsonValueToInt32(view["eps"]);
    if (view["air_date"]) w.airDate = bsonValueToString(view["air_date"]);
    if (view["air_weekday"]) w.airWeekday = bsonValueToInt32(view["air_weekday"]);
    if (view["images"] && view["images"].type() == bsoncxx::type::k_document)
        w.images = parseBangumiImages(view["images"].get_document().value);
    if (view["rating"] && view["rating"].type() == bsoncxx::type::k_document)
        w.rating = parseBangumiRating(view["rating"].get_document().value);
    if (view["rank"]) w.rank = bsonValueToInt32(view["rank"]);
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
    if (view["created_at"]) w.createdAt = bsonValueToInt64(view["created_at"]);
    if (view["updated_at"]) w.updatedAt = bsonValueToInt64(view["updated_at"]);
    return w;
}

// ==================== Model Serializers ====================

static void serializeBangumiImages(bsoncxx::builder::basic::document &builder, const BangumiImages &img) {
    builder.append(kvp("large", img.large));
    builder.append(kvp("common", img.common));
    builder.append(kvp("medium", img.medium));
    builder.append(kvp("small", img.small));
    builder.append(kvp("grid", img.grid));
}

static void serializeBangumiRating(bsoncxx::builder::basic::document &builder, const BangumiRating &r) {
    builder.append(kvp("score", r.score));
    builder.append(kvp("total", r.total));
    bsoncxx::builder::basic::document countDoc;
    for (const auto &[key, value]: r.count) {
        countDoc.append(kvp(key, value));
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
    builder.append(kvp("url", c.url));
    builder.append(kvp("name", c.name));
    builder.append(kvp("name_cn", c.nameCn));
    builder.append(kvp("role_name", c.roleName));
    bsoncxx::builder::basic::document imgDoc;
    serializeBangumiImages(imgDoc, c.images);
    builder.append(kvp("images", imgDoc.extract()));
}

static void serializeBangumiStaff(bsoncxx::builder::basic::document &builder, const BangumiStaff &s) {
    builder.append(kvp("id", s.id));
    builder.append(kvp("url", s.url));
    builder.append(kvp("name", s.name));
    builder.append(kvp("name_cn", s.nameCn));
    bsoncxx::builder::basic::array jobsArr;
    for (const auto &job: s.jobs) {
        jobsArr.append(job);
    }
    builder.append(kvp("jobs", jobsArr.extract()));
    bsoncxx::builder::basic::document imgDoc;
    serializeBangumiImages(imgDoc, s.images);
    builder.append(kvp("images", imgDoc.extract()));
}

static bsoncxx::builder::basic::document torrentToBson(const Torrent &t) {
    bsoncxx::builder::basic::document builder{};
    if (!t.id.empty()) builder.append(kvp("_id", stringToOid(t.id)));
    builder.append(kvp("hash", t.hash));
    builder.append(kvp("name", t.name));
    builder.append(kvp("size", static_cast<std::int64_t>(t.size)));
    builder.append(kvp("progress", t.progress));
    builder.append(kvp("state", t.state));
    builder.append(kvp("added_on", static_cast<std::int64_t>(t.addedOn)));
    builder.append(kvp("num_seeds", t.numSeeds));
    builder.append(kvp("num_leechs", t.numLeechs));
    builder.append(kvp("completion_on", static_cast<std::int64_t>(t.completionOn)));
    builder.append(kvp("save_path", t.savePath));
    builder.append(kvp("uploaded", static_cast<std::int64_t>(t.uploaded)));
    builder.append(kvp("downloaded", static_cast<std::int64_t>(t.downloaded)));
    builder.append(kvp("category", t.category));
    builder.append(kvp("tags", t.tags));
    builder.append(kvp("content_path", t.contentPath));
    builder.append(kvp("download_path", t.downloadPath));
    builder.append(kvp("infohash_v1", t.infohashV1));
    builder.append(kvp("infohash_v2", t.infohashV2));
    builder.append(kvp("comment", t.comment));
    builder.append(kvp("has_metadata", t.hasMetadata));
    builder.append(kvp("inactive_seeding_time_limit", t.inactiveSeedingTimeLimit));
    builder.append(kvp("max_inactive_seeding_time", t.maxInactiveSeedingTime));
    builder.append(kvp("popularity", t.popularity));
    builder.append(kvp("private", t.isPrivate));
    builder.append(kvp("root_path", t.rootPath));
    builder.append(kvp("amount_left", static_cast<std::int64_t>(t.amountLeft)));
    builder.append(kvp("auto_tmm", t.autoTmm));
    builder.append(kvp("availability", t.availability));
    builder.append(kvp("completed", static_cast<std::int64_t>(t.completed)));
    builder.append(kvp("dl_limit", t.dlLimit));
    builder.append(kvp("dlspeed", static_cast<std::int64_t>(t.dlSpeed)));
    builder.append(kvp("downloaded_session", static_cast<std::int64_t>(t.downloadedSession)));
    builder.append(kvp("eta", static_cast<std::int64_t>(t.eta)));
    builder.append(kvp("f_l_piece_prio", t.fLPiecePrio));
    builder.append(kvp("force_start", t.forceStart));
    builder.append(kvp("last_activity", static_cast<std::int64_t>(t.lastActivity)));
    builder.append(kvp("magnet_uri", t.magnetUri));
    builder.append(kvp("max_ratio", t.maxRatio));
    builder.append(kvp("max_seeding_time", t.maxSeedingTime));
    builder.append(kvp("num_complete", t.numComplete));
    builder.append(kvp("num_incomplete", t.numIncomplete));
    builder.append(kvp("priority", t.priority));
    builder.append(kvp("ratio", t.ratio));
    builder.append(kvp("ratio_limit", t.ratioLimit));
    builder.append(kvp("reannounce", t.reannounce));
    builder.append(kvp("seeding_time", static_cast<std::int64_t>(t.seedingTime)));
    builder.append(kvp("seeding_time_limit", t.seedingTimeLimit));
    builder.append(kvp("seen_complete", static_cast<std::int64_t>(t.seenComplete)));
    builder.append(kvp("seq_dl", t.seqDl));
    builder.append(kvp("super_seeding", t.superSeeding));
    builder.append(kvp("time_active", static_cast<std::int64_t>(t.timeActive)));
    builder.append(kvp("total_size", static_cast<std::int64_t>(t.totalSize)));
    builder.append(kvp("tracker", t.tracker));
    builder.append(kvp("trackers_count", t.trackersCount));
    builder.append(kvp("up_limit", t.upLimit));
    builder.append(kvp("uploaded_session", static_cast<std::int64_t>(t.uploadedSession)));
    builder.append(kvp("upspeed", static_cast<std::int64_t>(t.upSpeed)));
    builder.append(kvp("is_deleted", t.isDeleted));
    builder.append(kvp("synced_at", static_cast<std::int64_t>(t.syncedAt)));
    builder.append(kvp("created_at", static_cast<std::int64_t>(t.createdAt)));
    builder.append(kvp("updated_at", static_cast<std::int64_t>(t.updatedAt)));

    bsoncxx::builder::basic::array fileArr{};
    for (const auto &f: t.files) {
        bsoncxx::builder::basic::document fdoc{};
        if (!f.id.empty()) fdoc.append(kvp("_id", stringToOid(f.id)));
        fdoc.append(kvp("name", f.name));
        fdoc.append(kvp("size", static_cast<std::int64_t>(f.size)));
        fdoc.append(kvp("progress", f.progress));
        fdoc.append(kvp("index", f.index));
        fdoc.append(kvp("priority", f.priority));
        fdoc.append(kvp("is_seed", f.isSeed));
        fdoc.append(kvp("availability", f.availability));
        bsoncxx::builder::basic::array prArr{};
        for (int v: f.pieceRange) prArr.append(v);
        fdoc.append(kvp("piece_range", prArr.extract()));
        fdoc.append(kvp("created_at", static_cast<std::int64_t>(f.createdAt)));
        fdoc.append(kvp("updated_at", static_cast<std::int64_t>(f.updatedAt)));
        fileArr.append(fdoc.extract());
    }
    builder.append(kvp("files", fileArr.extract()));
    return builder;
}

static bsoncxx::builder::basic::document volumeToBson(const Volume &v) {
    bsoncxx::builder::basic::document builder{};
    if (!v.id.empty()) builder.append(kvp("_id", stringToOid(v.id)));
    builder.append(kvp("torrent_id", stringToOid(v.torrentId)));
    builder.append(kvp("volume_no", v.volumeNo));
    builder.append(kvp("catalog_no", v.catalogNo));
    builder.append(kvp("volume_name", v.volumeName));
    builder.append(kvp("is_deleted", v.isDeleted));
    builder.append(kvp("created_at", static_cast<std::int64_t>(v.createdAt)));
    builder.append(kvp("updated_at", static_cast<std::int64_t>(v.updatedAt)));
    appendOidArray(builder, "product_ids", v.productIds);
    appendOidArray(builder, "file_ids", v.fileIds);
    appendOidArray(builder, "work_ids", v.workIds);
    return builder;
}

static bsoncxx::builder::basic::document mediaToBson(const Media &m) {
    bsoncxx::builder::basic::document builder{};
    if (!m.id.empty()) builder.append(kvp("_id", stringToOid(m.id)));
    builder.append(kvp("volume_id", stringToOid(m.volumeId)));
    builder.append(kvp("media_no", m.mediaNo));
    builder.append(kvp("media_type", mediaTypeToString(m.mediaType)));
    builder.append(kvp("volume_no", m.volumeNo));
    builder.append(kvp("catalog_no", m.catalogNo));
    builder.append(kvp("content_title", m.contentTitle));
    builder.append(kvp("description", m.description));
    builder.append(kvp("is_deleted", m.isDeleted));
    builder.append(kvp("created_at", static_cast<std::int64_t>(m.createdAt)));
    builder.append(kvp("updated_at", static_cast<std::int64_t>(m.updatedAt)));
    appendOidArray(builder, "file_ids", m.fileIds);
    return builder;
}

static bsoncxx::builder::basic::document workToBson(const Work &w) {
    bsoncxx::builder::basic::document builder{};
    if (!w.id.empty()) builder.append(kvp("_id", stringToOid(w.id)));
    builder.append(kvp("id", w.bangumiSubjectId));
    builder.append(kvp("url", w.url));
    builder.append(kvp("type", w.type));
    builder.append(kvp("name", w.name));
    builder.append(kvp("name_cn", w.nameCn));
    builder.append(kvp("summary", w.summary));
    builder.append(kvp("eps", w.eps));
    builder.append(kvp("air_date", w.airDate));
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

    builder.append(kvp("created_at", static_cast<std::int64_t>(w.createdAt)));
    builder.append(kvp("updated_at", static_cast<std::int64_t>(w.updatedAt)));
    return builder;
}

// ==================== BddbRepository ====================

// ==================== Torrents ====================

DbResult<std::vector<Torrent> > BddbRepository::loadTorrents(bool includeDeleted) {
    try {
        if (!MongoConnection::instance().isConnected()) return std::vector<Torrent>{};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_torrents"];
        mongocxx::options::find opts;
        opts.projection(make_document(kvp("files", 0)));

        auto cursor = includeDeleted
                          ? coll.find({}, opts)
                          : coll.find(make_document(kvp("is_deleted", false)).view(), opts);

        std::vector<Torrent> results;
        for (auto &&doc: cursor) {
            results.push_back(parseTorrent(doc));
        }
        return results;
    } catch (const std::exception &e) {
        return std::unexpected(std::string("loadTorrents failed: ") + e.what());
    }
}

DbResult<Torrent> BddbRepository::getTorrentByHash(const std::string &hash) {
    try {
        if (!MongoConnection::instance().isConnected()) return Torrent{};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_torrents"];
        auto filter = make_document(kvp("hash", hash), kvp("is_deleted", false));
        if (auto result = coll.find_one(filter.view()); result) {
            return parseTorrent(result->view());
        }
        return Torrent{};
    } catch (const std::exception &e) {
        return std::unexpected(std::string("getTorrentByHash failed: ") + e.what());
    }
}

DbResult<Torrent> BddbRepository::getTorrentById(const std::string &id) {
    try {
        if (!MongoConnection::instance().isConnected()) return Torrent{};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_torrents"];
        auto filter = make_document(kvp("_id", stringToOid(id)));
        if (auto result = coll.find_one(filter.view()); result) {
            return parseTorrent(result->view());
        }
        return Torrent{};
    } catch (const std::exception &e) {
        return std::unexpected(std::string("getTorrentById failed: ") + e.what());
    }
}

DbResult<void> BddbRepository::upsertTorrent(const Torrent &torrent) {
    try {
        if (!MongoConnection::instance().isConnected()) return {};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_torrents"];
        auto filter = make_document(kvp("hash", torrent.hash));
        auto doc = torrentToBson(torrent);
        auto update = make_document(kvp("$set", doc.extract()));
        coll.update_one(filter.view(), update.view(), mongocxx::options::update{}.upsert(true));
        return {};
    } catch (const std::exception &e) {
        return std::unexpected(std::string("upsertTorrent failed: ") + e.what());
    }
}

DbResult<void> BddbRepository::softDeleteTorrent(const std::string &hash) {
    try {
        if (!MongoConnection::instance().isConnected()) return {};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_torrents"];
        auto filter = make_document(kvp("hash", hash));
        auto now = std::chrono::duration_cast<std::chrono::seconds>(std::chrono::system_clock::now().time_since_epoch()).count();
        auto update = make_document(kvp("$set", make_document(
                                            kvp("is_deleted", true),
                                            kvp("synced_at", static_cast<std::int64_t>(now)),
                                            kvp("updated_at", static_cast<std::int64_t>(now))
                                        )));
        coll.update_one(filter.view(), update.view());
        return {};
    } catch (const std::exception &e) {
        return std::unexpected(std::string("softDeleteTorrent failed: ") + e.what());
    }
}

DbResult<std::vector<FileItem> > BddbRepository::getTorrentFilesAsFileItems(const std::string &torrentId) {
    try {
        auto tResult = getTorrentById(torrentId);
        if (!tResult) return std::unexpected(tResult.error());
        std::vector<FileItem> list;
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
        return std::unexpected(std::string("getTorrentFilesAsFileItems failed: ") + e.what());
    }
}

DbResult<void> BddbRepository::saveTorrentFiles(const std::string &torrentId, const std::vector<TorrentFile> &files) {
    try {
        if (!MongoConnection::instance().isConnected()) return {};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_torrents"];
        auto filter = make_document(kvp("_id", stringToOid(torrentId)));
        auto existing = coll.find_one(filter.view());
        auto now = std::chrono::duration_cast<std::chrono::seconds>(std::chrono::system_clock::now().time_since_epoch()).count();

        std::map<std::string, TorrentFile> existingMap;
        if (existing && existing->view()["files"] && existing->view()["files"].type() == bsoncxx::type::k_array) {
            for (auto &&item: existing->view()["files"].get_array().value) {
                if (item.type() == bsoncxx::type::k_document) {
                    auto f = parseTorrentFile(item.get_document().value);
                    existingMap.emplace(f.name, f);
                }
            }
        }

        bsoncxx::builder::basic::array fileArr{};
        for (const auto &f: files) {
            auto it = existingMap.find(f.name);
            const auto &e = (it != existingMap.end()) ? it->second : TorrentFile{};
            bsoncxx::builder::basic::document fdoc{};
            if (!e.id.empty()) fdoc.append(kvp("_id", stringToOid(e.id)));
            else if (!f.id.empty()) fdoc.append(kvp("_id", stringToOid(f.id)));
            else fdoc.append(kvp("_id", bsoncxx::oid()));
            fdoc.append(kvp("name", f.name));
            fdoc.append(kvp("size", static_cast<std::int64_t>(f.size)));
            fdoc.append(kvp("progress", f.progress));
            fdoc.append(kvp("index", f.index));
            fdoc.append(kvp("priority", f.priority));
            fdoc.append(kvp("is_seed", f.isSeed));
            fdoc.append(kvp("availability", f.availability));
            bsoncxx::builder::basic::array prArr{};
            for (int v: f.pieceRange) prArr.append(v);
            fdoc.append(kvp("piece_range", prArr.extract()));
            fdoc.append(kvp("created_at", static_cast<std::int64_t>(e.createdAt ? e.createdAt : now)));
            fdoc.append(kvp("updated_at", static_cast<std::int64_t>(now)));
            fileArr.append(fdoc.extract());
        }

        auto update = make_document(kvp("$set", make_document(
                                            kvp("files", fileArr.extract()),
                                            kvp("updated_at", static_cast<std::int64_t>(now))
                                        )));
        coll.update_one(filter.view(), update.view());
        return {};
    } catch (const std::exception &e) {
        return std::unexpected(std::string("saveTorrentFiles failed: ") + e.what());
    }
}

DbResult<void> BddbRepository::softDeleteTorrentFiles(const std::string &torrentId) {
    try {
        if (!MongoConnection::instance().isConnected()) return {};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_torrents"];
        auto filter = make_document(kvp("_id", stringToOid(torrentId)));
        auto now = std::chrono::duration_cast<std::chrono::seconds>(std::chrono::system_clock::now().time_since_epoch()).count();
        auto update = make_document(kvp("$set", make_document(
                                            kvp("files", bsoncxx::builder::basic::array{}.extract()),
                                            kvp("updated_at", static_cast<std::int64_t>(now))
                                        )));
        coll.update_one(filter.view(), update.view());
        return {};
    } catch (const std::exception &e) {
        return std::unexpected(std::string("softDeleteTorrentFiles failed: ") + e.what());
    }
}

// ==================== Volumes ====================

DbResult<std::vector<Volume> > BddbRepository::loadVolumes(const std::string &torrentId) {
    return getAllVolumes(torrentId);
}

DbResult<std::vector<Volume> > BddbRepository::getAllVolumes(const std::string &torrentId) {
    try {
        if (!MongoConnection::instance().isConnected()) return std::vector<Volume>{};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_volumes"];
        mongocxx::options::find opts;
        opts.sort(make_document(kvp("volume_no", 1)));

        auto cursor = !torrentId.empty()
                          ? coll.find(make_document(kvp("torrent_id", stringToOid(torrentId)), kvp("is_deleted", false)).view(), opts)
                          : coll.find(make_document(kvp("is_deleted", false)).view(), opts);

        std::vector<Volume> results;
        for (auto &&doc: cursor) {
            results.push_back(parseVolume(doc));
        }
        return results;
    } catch (const std::exception &e) {
        return std::unexpected(std::string("getAllVolumes failed: ") + e.what());
    }
}

DbResult<Volume> BddbRepository::getVolumeById(const std::string &volumeId) {
    try {
        if (!MongoConnection::instance().isConnected()) return Volume{};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_volumes"];
        auto filter = make_document(kvp("_id", stringToOid(volumeId)), kvp("is_deleted", false));
        if (auto result = coll.find_one(filter.view()); result) {
            return parseVolume(result->view());
        }
        return Volume{};
    } catch (const std::exception &e) {
        return std::unexpected(std::string("getVolumeById failed: ") + e.what());
    }
}

DbResult<void> BddbRepository::saveVolume(const Volume &volume) {
    try {
        if (!MongoConnection::instance().isConnected()) return {};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_volumes"];
        auto now = std::chrono::duration_cast<std::chrono::seconds>(std::chrono::system_clock::now().time_since_epoch()).count();

        auto delFilter = make_document(
            kvp("torrent_id", stringToOid(volume.torrentId)),
            kvp("volume_no", volume.volumeNo)
        );
        coll.delete_one(delFilter.view());

        auto doc = volumeToBson(volume);
        if (volume.createdAt == 0) {
            doc.append(kvp("created_at", static_cast<std::int64_t>(now)));
        }
        doc.append(kvp("updated_at", static_cast<std::int64_t>(now)));
        coll.insert_one(doc.extract());
        return {};
    } catch (const std::exception &e) {
        return std::unexpected(std::string("saveVolume failed: ") + e.what());
    }
}

DbResult<std::map<std::string, int> > BddbRepository::getVolumeCounts() {
    try {
        if (!MongoConnection::instance().isConnected()) return std::map<std::string, int>{};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_volumes"];
        mongocxx::pipeline pipeline;
        pipeline.match(make_document(kvp("is_deleted", false)));
        pipeline.group(make_document(
            kvp("_id", "$torrent_id"),
            kvp("count", make_document(kvp("$sum", 1)))
        ));

        auto cursor = coll.aggregate(pipeline);
        std::map<std::string, int> counts;
        for (auto &&doc: cursor) {
            if (auto idElem = doc["_id"]; idElem) {
                auto [tid, count] = std::make_pair(
                    bsonOidToString(idElem),
                    bsonValueToInt32(doc["count"])
                );
                counts.emplace(tid, count);
            }
        }
        return counts;
    } catch (const std::exception &e) {
        return std::unexpected(std::string("getVolumeCounts failed: ") + e.what());
    }
}

DbResult<void> BddbRepository::deleteStaleVolumes(const std::string &torrentId, const std::vector<int> &keepVolumeNos) {
    try {
        if (!MongoConnection::instance().isConnected()) return {};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_volumes"];
        auto now = std::chrono::duration_cast<std::chrono::seconds>(std::chrono::system_clock::now().time_since_epoch()).count();

        bsoncxx::builder::basic::document builder{};
        builder.append(kvp("torrent_id", stringToOid(torrentId)));
        builder.append(kvp("is_deleted", false));
        if (!keepVolumeNos.empty()) {
            bsoncxx::builder::basic::array arr{};
            for (int n: keepVolumeNos) arr.append(n);
            builder.append(kvp("volume_no", make_document(kvp("$nin", arr.extract()))));
        }

        auto update = make_document(kvp("$set", make_document(
                                            kvp("is_deleted", true),
                                            kvp("updated_at", static_cast<std::int64_t>(now))
                                        )));
        coll.update_many(builder.extract(), update.view());
        return {};
    } catch (const std::exception &e) {
        return std::unexpected(std::string("deleteStaleVolumes failed: ") + e.what());
    }
}

DbResult<std::vector<FileItem> > BddbRepository::getVolumeFilesAsFileItems(const std::string &volumeId) {
    try {
        auto vResult = getVolumeById(volumeId);
        if (!vResult) return std::unexpected(vResult.error());
        if (vResult->id.empty()) return std::vector<FileItem>{};
        auto tResult = getTorrentById(vResult->torrentId);
        if (!tResult) return std::unexpected(tResult.error());
        std::unordered_set<std::string> idSet(vResult->fileIds.begin(), vResult->fileIds.end());
        std::vector<FileItem> list;
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
        return std::unexpected(std::string("getVolumeFilesAsFileItems failed: ") + e.what());
    }
}

// ==================== Medias ====================

DbResult<std::vector<Media> > BddbRepository::loadMedias(const std::string &volumeId) {
    try {
        if (!MongoConnection::instance().isConnected()) return std::vector<Media>{};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_medias"];
        mongocxx::options::find opts;
        opts.sort(make_document(kvp("media_no", 1)));
        auto filter = make_document(kvp("volume_id", stringToOid(volumeId)), kvp("is_deleted", false));

        auto cursor = coll.find(filter.view(), opts);
        std::vector<Media> results;
        for (auto &&doc: cursor) {
            results.push_back(parseMedia(doc));
        }
        return results;
    } catch (const std::exception &e) {
        return std::unexpected(std::string("loadMedias failed: ") + e.what());
    }
}

DbResult<std::map<std::string, int> > BddbRepository::getMediaCountsByVolume() {
    try {
        if (!MongoConnection::instance().isConnected()) return std::map<std::string, int>{};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_medias"];
        mongocxx::pipeline pipeline;
        pipeline.match(make_document(kvp("is_deleted", false)));
        pipeline.group(make_document(
            kvp("_id", "$volume_id"),
            kvp("count", make_document(kvp("$sum", 1)))
        ));

        auto cursor = coll.aggregate(pipeline);
        std::map<std::string, int> counts;
        for (auto &&doc: cursor) {
            if (auto idElem = doc["_id"]; idElem) {
                auto [vid, count] = std::make_pair(
                    bsonOidToString(idElem),
                    bsonValueToInt32(doc["count"])
                );
                counts.emplace(vid, count);
            }
        }
        return counts;
    } catch (const std::exception &e) {
        return std::unexpected(std::string("getMediaCountsByVolume failed: ") + e.what());
    }
}

DbResult<void> BddbRepository::saveMedia(const Media &media) {
    try {
        if (!MongoConnection::instance().isConnected()) return {};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_medias"];
        auto now = std::chrono::duration_cast<std::chrono::seconds>(std::chrono::system_clock::now().time_since_epoch()).count();

        auto delFilter = make_document(
            kvp("volume_id", stringToOid(media.volumeId)),
            kvp("media_no", media.mediaNo),
            kvp("media_type", mediaTypeToString(media.mediaType))
        );
        coll.delete_one(delFilter.view());

        auto doc = mediaToBson(media);
        if (media.createdAt == 0) {
            doc.append(kvp("created_at", static_cast<std::int64_t>(now)));
        }
        doc.append(kvp("updated_at", static_cast<std::int64_t>(now)));
        coll.insert_one(doc.extract());
        return {};
    } catch (const std::exception &e) {
        return std::unexpected(std::string("saveMedia failed: ") + e.what());
    }
}

DbResult<void> BddbRepository::deleteStaleMedias(const std::string &volumeId, const std::vector<std::pair<int, MediaType> > &keepMedias) {
    try {
        if (!MongoConnection::instance().isConnected()) return {};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_medias"];
        auto now = std::chrono::duration_cast<std::chrono::seconds>(std::chrono::system_clock::now().time_since_epoch()).count();

        if (keepMedias.empty()) {
            auto filter = make_document(kvp("volume_id", stringToOid(volumeId)), kvp("is_deleted", false));
            auto update = make_document(kvp("$set", make_document(
                                                kvp("is_deleted", true),
                                                kvp("updated_at", static_cast<std::int64_t>(now))
                                            )));
            coll.update_many(filter.view(), update.view());
            return {};
        }

        bsoncxx::builder::basic::array norArr{};
        for (const auto &p: keepMedias) {
            bsoncxx::builder::basic::document cond{};
            cond.append(kvp("media_no", p.first));
            cond.append(kvp("media_type", mediaTypeToString(p.second)));
            norArr.append(cond.extract());
        }

        auto filter = make_document(
            kvp("volume_id", stringToOid(volumeId)),
            kvp("is_deleted", false),
            kvp("$nor", norArr.extract())
        );
        auto update = make_document(kvp("$set", make_document(
                                            kvp("is_deleted", true),
                                            kvp("updated_at", static_cast<std::int64_t>(now))
                                        )));
        coll.update_many(filter.view(), update.view());
        return {};
    } catch (const std::exception &e) {
        return std::unexpected(std::string("deleteStaleMedias failed: ") + e.what());
    }
}

DbResult<std::map<std::string, int> > BddbRepository::getWorkCountsByVolume() {
    try {
        if (!MongoConnection::instance().isConnected()) return std::map<std::string, int>{};
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
        std::map<std::string, int> counts;
        for (auto &&doc: cursor) {
            if (auto idElem = doc["_id"]; idElem) {
                auto [vid, count] = std::make_pair(
                    bsonOidToString(idElem),
                    bsonValueToInt32(doc["count"])
                );
                counts.emplace(vid, count);
            }
        }
        return counts;
    } catch (const std::exception &e) {
        return std::unexpected(std::string("getWorkCountsByVolume failed: ") + e.what());
    }
}

// ==================== Works ====================

DbResult<std::vector<Work> > BddbRepository::loadWorks() {
    try {
        if (!MongoConnection::instance().isConnected()) return std::vector<Work>{};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_works"];

        auto cursor = coll.find({});
        std::vector<Work> results;
        for (auto &&doc: cursor) {
            results.push_back(parseWork(doc));
        }
        return results;
    } catch (const std::exception &e) {
        return std::unexpected(std::string("loadWorks failed: ") + e.what());
    }
}

DbResult<Work> BddbRepository::getWorkById(const std::string &id) {
    try {
        if (!MongoConnection::instance().isConnected()) return Work{};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_works"];
        auto filter = make_document(kvp("_id", stringToOid(id)));
        if (auto result = coll.find_one(filter.view()); result) {
            return parseWork(result->view());
        }
        return Work{};
    } catch (const std::exception &e) {
        return std::unexpected(std::string("getWorkById failed: ") + e.what());
    }
}

DbResult<Work> BddbRepository::getWorkByBangumiSubjectId(int subjectId) {
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
        return std::unexpected(std::string("getWorkByBangumiSubjectId failed: ") + e.what());
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
        if (existingResult->id.empty()) {
            doc.append(kvp("created_at", static_cast<std::int64_t>(now)));
        } else {
            doc.append(kvp("created_at", static_cast<std::int64_t>(existingResult->createdAt)));
        }
        doc.append(kvp("updated_at", static_cast<std::int64_t>(now)));

        if (!existingResult->id.empty()) {
            auto filter = make_document(kvp("_id", stringToOid(existingResult->id)));
            auto update = make_document(kvp("$set", doc.extract()));
            coll.update_one(filter.view(), update.view());
        } else {
            coll.insert_one(doc.extract());
        }
        return {};
    } catch (const std::exception &e) {
        return std::unexpected(std::string("saveWork failed: ") + e.what());
    }
}

DbResult<void> BddbRepository::removeWorkFromVolume(const std::string &volumeId, const std::string &workId) {
    try {
        if (!MongoConnection::instance().isConnected()) return {};
        auto db = MongoConnection::instance().database("bddb_dev");
        auto coll = db["bddb_volumes"];
        auto now = std::chrono::duration_cast<std::chrono::seconds>(std::chrono::system_clock::now().time_since_epoch()).count();
        auto filter = make_document(kvp("_id", stringToOid(volumeId)));
        auto update = make_document(kvp("$pull", make_document(
                                            kvp("work_ids", stringToOid(workId))
                                        )), kvp("$set", make_document(
                                                    kvp("updated_at", static_cast<std::int64_t>(now))
                                                )));
        coll.update_one(filter.view(), update.view());
        return {};
    } catch (const std::exception &e) {
        return std::unexpected(std::string("removeWorkFromVolume failed: ") + e.what());
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

        if (!params.searchCatalogNo.empty()) {
            matchStage.append(kvp("catalog_no", make_document(
                                      kvp("$regex", params.searchCatalogNo),
                                      kvp("$options", "i")
                                  )));
        }
        if (!params.searchTitle.empty()) {
            matchStage.append(kvp("volume_name", make_document(
                                      kvp("$regex", params.searchTitle),
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
                result.total = bsonValueToInt32(doc["total"]);
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
        return std::unexpected(std::string("getVolumesWithPagination failed: ") + e.what());
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
        int processed = 0;

        auto filter = make_document(kvp("is_deleted", false));
        auto cursor = volumesColl.find(filter.view());

        for (auto &&doc: cursor) {
            ++processed;
            if (onProgress) {
                (*onProgress)(processed, static_cast<int>(totalCount), "Processing volume " + std::to_string(processed));
            }
            Volume v = parseVolume(doc);
            auto catalogNo = v.catalogNo;
            auto start = catalogNo.find_first_not_of(" \t\r\n");
            if (start == std::string::npos) continue;
            auto end = catalogNo.find_last_not_of(" \t\r\n");
            catalogNo = catalogNo.substr(start, end - start + 1);
            if (catalogNo.empty()) continue;

            auto productsResult = SurugaYaRepository::findProductsByCatalogNo(catalogNo);
            if (!productsResult) continue;
            const auto &products = *productsResult;

            std::vector<std::string> newIds;
            std::unordered_set<std::string> existingSet(v.productIds.begin(), v.productIds.end());

            for (const auto &product: products) {
                result.matched++;
                if (!existingSet.contains(product.id)) {
                    newIds.push_back(product.id);
                } else {
                    result.skipped++;
                }
            }

            if (!newIds.empty()) {
                auto now = std::chrono::duration_cast<std::chrono::seconds>(std::chrono::system_clock::now().time_since_epoch()).count();
                bsoncxx::builder::basic::array addArr{};
                for (const auto &nid: newIds) addArr.append(stringToOid(nid));
                auto vFilter = make_document(kvp("_id", stringToOid(v.id)));
                auto update = make_document(
                    kvp("$addToSet", make_document(kvp("product_ids", make_document(kvp("$each", addArr.extract()))))),
                    kvp("$set", make_document(kvp("updated_at", static_cast<std::int64_t>(now))))
                );
                volumesColl.update_one(vFilter.view(), update.view());
                result.updated++;
            }
        }

        return result;
    } catch (const std::exception &e) {
        return std::unexpected(std::string("linkVolumesToProducts failed: ") + e.what());
    }
}

