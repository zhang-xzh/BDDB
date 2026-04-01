#ifndef MODELS_H
#define MODELS_H

#include <QString>
#include <QVector>
#include <QDateTime>
#include <QMap>
#include <QVariant>

// ==================== Bangumi 子类型 ====================

struct BangumiImages {
    QString large;
    QString common;
    QString medium;
    QString small;
    QString grid;
};

struct BangumiRating {
    double score = 0.0;
    int total = 0;
    QMap<QString, int> count;
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
    QString url;
    QString name;
    QString nameCn;
    QString roleName;
    BangumiImages images;
};

struct BangumiStaff {
    int id = 0;
    QString url;
    QString name;
    QString nameCn;
    QVector<QString> jobs;
    BangumiImages images;
};

// ==================== Product 子类型 ====================

struct TrackList {
    QString disc;
    QVector<QString> tracks;
};

struct ProductAttributes {
    QString catalogNo;           // 型番
    QString manufacturer;        // メーカー
    QString releaseDate;         // 発売日
    QString price;               // 定価
    QString scenario;            // シナリオ
    QString characterDesign;     // キャラクターデザイン
    QString music;               // 音楽
    QVector<QString> illustrators; // 原画
    QVector<QString> voiceActors;  // 声優
    QMap<QString, QVariant> extra; // 其他未知属性
};

// ==================== 核心模型 ====================

struct TorrentFile {
    QString id;
    QString name;
    QString path;
    qint64 size = 0;
    double progress = 0.0;
    int index = 0;
    int priority = 0;
    bool isSeed = false;
    QVector<int> pieceRange;
    double availability = 0.0;
    qint64 createdAt = 0;
    qint64 updatedAt = 0;
};

struct Torrent {
    QString id;
    QString hash;
    QString name;
    qint64 size = 0;
    double progress = 0.0;
    QString state;
    qint64 addedOn = 0;
    int numSeeds = 0;
    int numLeechs = 0;
    qint64 completionOn = 0;
    QString savePath;
    qint64 uploaded = 0;
    qint64 downloaded = 0;
    QString category;
    QString tags;
    QString contentPath;
    QString downloadPath;
    QString infohashV1;
    QString infohashV2;
    QString comment;
    bool hasMetadata = false;
    int inactiveSeedingTimeLimit = 0;
    int maxInactiveSeedingTime = 0;
    double popularity = 0.0;
    bool isPrivate = false;
    QString rootPath;
    bool isDeleted = false;
    qint64 syncedAt = 0;
    qint64 createdAt = 0;
    qint64 updatedAt = 0;
    QVector<TorrentFile> files;

    bool hasVolumes = false;
    int volumeCount = 0;

    // qBittorrent extended fields
    qint64 amountLeft = 0;
    bool autoTmm = false;
    double availability = 0.0;
    qint64 completed = 0;
    int dlLimit = 0;
    qint64 dlSpeed = 0;
    qint64 downloadedSession = 0;
    qint64 eta = 0;
    bool fLPiecePrio = false;
    bool forceStart = false;
    qint64 lastActivity = 0;
    QString magnetUri;
    double maxRatio = 0.0;
    int maxSeedingTime = 0;
    int numComplete = 0;
    int numIncomplete = 0;
    int priority = 0;
    double ratio = 0.0;
    double ratioLimit = 0.0;
    int reannounce = 0;
    qint64 seedingTime = 0;
    int seedingTimeLimit = 0;
    qint64 seenComplete = 0;
    bool seqDl = false;
    bool superSeeding = false;
    qint64 timeActive = 0;
    qint64 totalSize = 0;
    QString tracker;
    int trackersCount = 0;
    int upLimit = 0;
    qint64 uploadedSession = 0;
    qint64 upSpeed = 0;
};

struct Volume {
    QString id;
    QString torrentId;
    int volumeNo = 1;
    QString catalogNo;
    QString volumeName;
    bool isDeleted = false;
    qint64 createdAt = 0;
    qint64 updatedAt = 0;
    QVector<QString> productIds;
    QVector<QString> fileIds;
    QVector<QString> workIds;
};

enum class MediaType {
    BD,
    DVD,
    CD,
    Scan,
    Unknown
};

inline QString mediaTypeToString(MediaType type) {
    switch (type) {
        case MediaType::BD: return QStringLiteral("bd");
        case MediaType::DVD: return QStringLiteral("dvd");
        case MediaType::CD: return QStringLiteral("cd");
        case MediaType::Scan: return QStringLiteral("scan");
        default: return QStringLiteral("bd");
    }
}

inline MediaType mediaTypeFromString(const QString &str) {
    if (str.compare(QLatin1String("bd"), Qt::CaseInsensitive) == 0) return MediaType::BD;
    if (str.compare(QLatin1String("dvd"), Qt::CaseInsensitive) == 0) return MediaType::DVD;
    if (str.compare(QLatin1String("cd"), Qt::CaseInsensitive) == 0) return MediaType::CD;
    if (str.compare(QLatin1String("scan"), Qt::CaseInsensitive) == 0) return MediaType::Scan;
    return MediaType::Unknown;
}

struct Media {
    QString id;
    QString volumeId;
    int mediaNo = 1;
    MediaType mediaType = MediaType::BD;
    int volumeNo = 0;
    QString catalogNo;
    QString contentTitle;
    QString description;
    bool isDeleted = false;
    qint64 createdAt = 0;
    qint64 updatedAt = 0;
    QVector<QString> fileIds;
};

struct Work {
    QString id;

    // Bangumi API 原始字段 (bangumi.ts 中 BddbWork)
    int bangumiSubjectId = 0;    // Bangumi subject ID (TS中的 id)
    QString url;
    int type = 2;                // 条目类型 (1=书籍, 2=动画, 3=音乐, 4=游戏, 6=三次元)
    QString name;
    QString nameCn;
    QString summary;
    int eps = 0;
    QString airDate;
    int airWeekday = 0;

    BangumiImages images;
    BangumiRating rating;
    int rank = 0;
    BangumiCollection collection;
    QVector<BangumiCharacter> characters;
    QVector<BangumiStaff> staff;

    qint64 createdAt = 0;
    qint64 updatedAt = 0;
};

struct Product {
    QString id;
    QString productId;           // 商品ID (如 "109001543001")
    QString title;
    QString url;
    QVector<QString> images;
    QString noteRaw;             // 描述 (HTML格式)
    QVector<TrackList> tracklist;
    ProductAttributes attributes;

    // Search doc 简化字段
    QString manufacturer;
    QVector<QString> voiceActors;
    QVector<QString> artists;
    QString scenario;
    QString modelNumber;
    QString releaseDate;
    QString price;
};

// ==================== 表单/辅助类型 ====================

struct VolumeForm {
    QString catalogNo;
    QString volumeName;
    QString type; // "volume" | "box"
    QString mediaType; // "BD" | "DVD"
};

struct MediaForm {
    MediaType mediaType = MediaType::BD;
    QString contentTitle;
    QString description;
};

struct FileItem {
    QString id;
    QString name;
    qint64 size = 0;
    double progress = 0.0;
};

struct VolumeListParams {
    int page = 1;
    int pageSize = 20;
    QString searchCatalogNo;
    QString searchTitle;
    bool filterHasWork = false;
    bool filterHasMedia = false;
    bool useFilterHasWork = false;  // 是否启用 filterHasWork
    bool useFilterHasMedia = false; // 是否启用 filterHasMedia
};

struct VolumeListResult {
    QVector<Volume> data;
    int total = 0;
    int page = 1;
    int pageSize = 20;
};

struct NodeData {
    int volumeNo = 0;
    QVector<int> sharedVolumeNos;
    QVector<QString> files;

    int mediaNo = 0;
    MediaType mediaType = MediaType::BD;
    QVector<int> sharedMedias;
};

// ==================== Bangumi 离线数据库文档类型 ====================

struct BangumiSubjectDoc {
    int id = 0;
    QString name;
    QString nameCn;
    int type = 0;
    QString summary;
    bool nsfw = false;
    QString date;
    double score = 0.0;
    int rank = 0;
    QMap<QString, int> scoreDetails;
    int wish = 0;
    int collect = 0;
    int doing = 0;
    int onHold = 0;
    int dropped = 0;
};

struct BangumiStaffItem {
    int personId = 0;
    QString name;
    QString nameCn;
    QString position;
    QString url;
};

struct BangumiCharacterItem {
    int characterId = 0;
    QString name;
    QString nameCn;
    int roleType = 0;
    int order = 0;
    QString url;
};

struct BangumiSubjectRelationItem {
    int subjectId = 0;
    QString name;
    QString nameCn;
    QString relationType;
    QString url;
};

struct BangumiEpisodeDoc {
    int id = 0;
    int subjectId = 0;
    int type = 0;
    QString name;
    QString nameCn;
    int sort = 0;
    QString airdate;
    QString duration;
    QString description;
    int disc = 0;
};

struct BangumiSubjectDetail : public BangumiSubjectDoc {
    QVector<BangumiStaffItem> staff;
    QVector<BangumiCharacterItem> characters;
    QVector<BangumiEpisodeDoc> episodes;
    QVector<BangumiSubjectRelationItem> relations;
};

#endif // MODELS_H
