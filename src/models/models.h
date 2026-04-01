#ifndef MODELS_H
#define MODELS_H

#include <string>
#include <vector>
#include <map>
#include <cstdint>
#include <QString>

// ==================== Bangumi 子类型 ====================

struct BangumiImages {
    std::string large;
    std::string common;
    std::string medium;
    std::string small;
    std::string grid;
};

struct BangumiRating {
    double score = 0.0;
    int total = 0;
    std::map<std::string, int> count;
};

struct BangumiCollection {
    int wish = 0;
    int collect = 0;
    int doing = 0;
    int on_hold = 0;
    int dropped = 0;
};

struct BangumiCharacter {
    int id = 0;
    std::string url;
    std::string name;
    std::string nameCn;
    std::string roleName;
    BangumiImages images;
};

struct BangumiStaff {
    int id = 0;
    std::string url;
    std::string name;
    std::string nameCn;
    std::vector<std::string> jobs;
    BangumiImages images;
};

// ==================== Product 子类型 ====================

struct TrackList {
    std::string disc;
    std::vector<std::string> tracks;
};

struct ProductAttributes {
    std::string catalogNo; // 型番
    std::string manufacturer; // メーカー
    std::string releaseDate; // 発売日
    std::string price; // 定価
    std::string scenario; // シナリオ
    std::string characterDesign; // キャラクターデザイン
    std::string music; // 音楽
    std::vector<std::string> illustrators; // 原画
    std::vector<std::string> voiceActors; // 声優
    std::map<std::string, std::string> extra; // 其他未知属性
};

// ==================== 核心模型 ====================

struct TorrentFile {
    std::string id;
    std::string name;
    std::string path;
    std::int64_t size = 0;
    double progress = 0.0;
    int index = 0;
    int priority = 0;
    bool isSeed = false;
    std::vector<int> pieceRange;
    double availability = 0.0;
    std::int64_t createdAt = 0;
    std::int64_t updatedAt = 0;
};

struct Torrent {
    std::string id;
    std::string hash;
    std::string name;
    std::int64_t size = 0;
    double progress = 0.0;
    std::string state;
    std::int64_t addedOn = 0;
    int numSeeds = 0;
    int numLeechs = 0;
    std::int64_t completionOn = 0;
    std::string savePath;
    std::int64_t uploaded = 0;
    std::int64_t downloaded = 0;
    std::string category;
    std::string tags;
    std::string contentPath;
    std::string downloadPath;
    std::string infohashV1;
    std::string infohashV2;
    std::string comment;
    bool hasMetadata = false;
    int inactiveSeedingTimeLimit = 0;
    int maxInactiveSeedingTime = 0;
    double popularity = 0.0;
    bool isPrivate = false;
    std::string rootPath;
    bool isDeleted = false;
    std::int64_t syncedAt = 0;
    std::int64_t createdAt = 0;
    std::int64_t updatedAt = 0;
    std::vector<TorrentFile> files;
    bool hasVolumes = false;
    int volumeCount = 0;
    std::int64_t amountLeft = 0;
    bool autoTmm = false;
    double availability = 0.0;
    std::int64_t completed = 0;
    int dlLimit = 0;
    std::int64_t dlSpeed = 0;
    std::int64_t downloadedSession = 0;
    std::int64_t eta = 0;
    bool fLPiecePrio = false;
    bool forceStart = false;
    std::int64_t lastActivity = 0;
    std::string magnetUri;
    double maxRatio = 0.0;
    int maxSeedingTime = 0;
    int numComplete = 0;
    int numIncomplete = 0;
    int priority = 0;
    double ratio = 0.0;
    double ratioLimit = 0.0;
    int reannounce = 0;
    std::int64_t seedingTime = 0;
    int seedingTimeLimit = 0;
    std::int64_t seenComplete = 0;
    bool seqDl = false;
    bool superSeeding = false;
    std::int64_t timeActive = 0;
    std::int64_t totalSize = 0;
    std::string tracker;
    int trackersCount = 0;
    int upLimit = 0;
    std::int64_t uploadedSession = 0;
    std::int64_t upSpeed = 0;
};

struct Volume {
    std::string id;
    std::string torrentId;
    int volumeNo = 1;
    std::string catalogNo;
    std::string volumeName;
    bool isDeleted = false;
    std::int64_t createdAt = 0;
    std::int64_t updatedAt = 0;
    std::vector<std::string> productIds;
    std::vector<std::string> fileIds;
    std::vector<std::string> workIds;
};

enum class MediaType {
    BD,
    DVD,
    CD,
    Scan,
    Unknown
};

inline std::string mediaTypeToString(MediaType type) {
    switch (type) {
        case MediaType::BD: return "bd";
        case MediaType::DVD: return "dvd";
        case MediaType::CD: return "cd";
        case MediaType::Scan: return "scan";
        default: return "bd";
    }
}

inline MediaType mediaTypeFromString(const std::string &str) {
    if (str == "bd" || str == "BD" || str == "Bd") return MediaType::BD;
    if (str == "dvd" || str == "DVD" || str == "Dvd") return MediaType::DVD;
    if (str == "cd" || str == "CD" || str == "Cd") return MediaType::CD;
    if (str == "scan" || str == "SCAN" || str == "Scan") return MediaType::Scan;
    return MediaType::Unknown;
}

inline QString toQString(const std::string &s) {
    return QString::fromUtf8(s.data(), static_cast<qsizetype>(s.size()));
}

inline std::string fromQString(const QString &s) {
    return s.toStdString();
}

struct Media {
    std::string id;
    std::string volumeId;
    int mediaNo = 1;
    MediaType mediaType = MediaType::BD;
    int volumeNo = 0;
    std::string catalogNo;
    std::string contentTitle;
    std::string description;
    bool isDeleted = false;
    std::int64_t createdAt = 0;
    std::int64_t updatedAt = 0;
    std::vector<std::string> fileIds;
};

struct Work {
    std::string id;

    // Bangumi API 原始字段 (bangumi.ts 中 BddbWork)
    int bangumiSubjectId = 0; // Bangumi subject ID (TS中的 id)
    std::string url;
    int type = 2; // 条目类型 (1=书籍, 2=动画, 3=音乐, 4=游戏, 6=三次元)
    std::string name;
    std::string nameCn;
    std::string summary;
    int eps = 0;
    std::string airDate;
    int airWeekday = 0;

    BangumiImages images;
    BangumiRating rating;
    int rank = 0;
    BangumiCollection collection;
    std::vector<BangumiCharacter> characters;
    std::vector<BangumiStaff> staff;

    std::int64_t createdAt = 0;
    std::int64_t updatedAt = 0;
};

struct Product {
    std::string id;
    std::string productId; // 商品ID (如 "109001543001")
    std::string title;
    std::string url;
    std::vector<std::string> images;
    std::string noteRaw; // 描述 (HTML格式)
    std::vector<TrackList> tracklist;
    ProductAttributes attributes;

    // Search doc 简化字段
    std::string manufacturer;
    std::vector<std::string> voiceActors;
    std::vector<std::string> artists;
    std::string scenario;
    std::string modelNumber;
    std::string releaseDate;
    std::string price;
};

// ==================== 表单/辅助类型 ====================

struct VolumeForm {
    std::string catalogNo;
    std::string volumeName;
    std::string type; // "volume" | "box"
    std::string mediaType; // "BD" | "DVD"
};

struct MediaForm {
    MediaType mediaType = MediaType::BD;
    std::string contentTitle;
    std::string description;
};

struct FileItem {
    std::string id;
    std::string name;
    std::int64_t size = 0;
    double progress = 0.0;
};

struct VolumeListParams {
    int page = 1;
    int pageSize = 20;
    std::string searchCatalogNo;
    std::string searchTitle;
    bool filterHasWork = false;
    bool filterHasMedia = false;
    bool useFilterHasWork = false; // 是否启用 filterHasWork
    bool useFilterHasMedia = false; // 是否启用 filterHasMedia
};

struct VolumeListResult {
    std::vector<Volume> data;
    int total = 0;
    int page = 1;
    int pageSize = 20;
};

struct NodeData {
    int volumeNo = 0;
    std::vector<int> sharedVolumeNos;
    std::vector<std::string> files;

    int mediaNo = 0;
    MediaType mediaType = MediaType::BD;
    std::vector<int> sharedMedias;
};

// ==================== Bangumi 离线数据库文档类型 ====================

struct BangumiSubjectDoc {
    int id = 0;
    std::string name;
    std::string nameCn;
    int type = 0;
    std::string summary;
    bool nsfw = false;
    std::string date;
    double score = 0.0;
    int rank = 0;
    std::map<std::string, int> scoreDetails;
    int wish = 0;
    int collect = 0;
    int doing = 0;
    int onHold = 0;
    int dropped = 0;
};

struct BangumiStaffItem {
    int personId = 0;
    std::string name;
    std::string nameCn;
    std::string position;
    std::string url;
};

struct BangumiCharacterItem {
    int characterId = 0;
    std::string name;
    std::string nameCn;
    int roleType = 0;
    int order = 0;
    std::string url;
};

struct BangumiSubjectRelationItem {
    int subjectId = 0;
    std::string name;
    std::string nameCn;
    std::string relationType;
    std::string url;
};

struct BangumiEpisodeDoc {
    int id = 0;
    int subjectId = 0;
    int type = 0;
    std::string name;
    std::string nameCn;
    int sort = 0;
    std::string airdate;
    std::string duration;
    std::string description;
    int disc = 0;
};

struct BangumiSubjectDetail : BangumiSubjectDoc {
    std::vector<BangumiStaffItem> staff;
    std::vector<BangumiCharacterItem> characters;
    std::vector<BangumiEpisodeDoc> episodes;
    std::vector<BangumiSubjectRelationItem> relations;
};

#endif // MODELS_H
