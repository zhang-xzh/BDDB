#ifndef MODELS_H
#define MODELS_H

#include <QList>
#include <QMap>
#include <QString>

// ==================== Bangumi 子类型 ====================

struct BangumiImages {
    QString large;
    QString common;
    QString medium;
    QString small;
    QString grid;
};

struct BangumiRating {
    qreal score = 0.0;
    qint32 total = 0;
    QMap<QString, qint32> count;
};

struct BangumiCollection {
    qint32 wish = 0;
    qint32 collect = 0;
    qint32 doing = 0;
    qint32 on_hold = 0;
    qint32 dropped = 0;
};

struct BangumiCharacter {
    qint32 id = 0;
    QString url;
    QString name;
    QString nameCn;
    QString roleName;
    BangumiImages images;
};

struct BangumiStaff {
    qint32 id = 0;
    QString url;
    QString name;
    QString nameCn;
    QList<QString> jobs;
    BangumiImages images;
};

// ==================== Product 子类型 ====================

struct TrackList {
    QString disc;
    QList<QString> tracks;
};

struct ProductAttributes {
    QString catalogNo; // 型番
    QString manufacturer; // メーカー
    QString releaseDate; // 発売日
    QString price; // 定価
    QString scenario; // シナリオ
    QString characterDesign; // キャラクターデザイン
    QString music; // 音楽
    QList<QString> illustrators; // 原画
    QList<QString> voiceActors; // 声優
    QMap<QString, QString> extra; // 其他未知属性
};

// ==================== 核心模型 ====================

struct TorrentFile {
    QString id;
    QString name;
    QString path;
    qint64 size = 0;
    qreal progress = 0.0;
    qint32 index = 0;
    qint32 priority = 0;
    bool isSeed = false;
    QList<qint32> pieceRange;
    qreal availability = 0.0;
    qint64 createdAt = 0;
    qint64 updatedAt = 0;
};

struct Torrent {
    QString id;
    QString hash;
    QString name;
    qint64 size = 0;
    qreal progress = 0.0;
    QString state;
    qint64 addedOn = 0;
    qint32 numSeeds = 0;
    qint32 numLeechs = 0;
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
    qint32 inactiveSeedingTimeLimit = 0;
    qint32 maxInactiveSeedingTime = 0;
    qreal popularity = 0.0;
    bool isPrivate = false;
    QString rootPath;
    bool isDeleted = false;
    qint64 syncedAt = 0;
    qint64 createdAt = 0;
    qint64 updatedAt = 0;
    QList<TorrentFile> files;
    bool hasVolumes = false;
    qint32 volumeCount = 0;
    qint64 amountLeft = 0;
    bool autoTmm = false;
    qreal availability = 0.0;
    qint64 completed = 0;
    qint32 dlLimit = 0;
    qint64 dlSpeed = 0;
    qint64 downloadedSession = 0;
    qint64 eta = 0;
    bool fLPiecePrio = false;
    bool forceStart = false;
    qint64 lastActivity = 0;
    QString magnetUri;
    qreal maxRatio = 0.0;
    qint32 maxSeedingTime = 0;
    qint32 numComplete = 0;
    qint32 numIncomplete = 0;
    qint32 priority = 0;
    qreal ratio = 0.0;
    qreal ratioLimit = 0.0;
    qint32 reannounce = 0;
    qint64 seedingTime = 0;
    qint32 seedingTimeLimit = 0;
    qint64 seenComplete = 0;
    bool seqDl = false;
    bool superSeeding = false;
    qint64 timeActive = 0;
    qint64 totalSize = 0;
    QString tracker;
    qint32 trackersCount = 0;
    qint32 upLimit = 0;
    qint64 uploadedSession = 0;
    qint64 upSpeed = 0;
};

struct Volume {
    QString id;
    QString torrentId;
    qint32 volumeNo = 1;
    QString catalogNo;
    QString volumeName;
    bool isDeleted = false;
    qint64 createdAt = 0;
    qint64 updatedAt = 0;
    QList<QString> productIds;
    QList<QString> fileIds;
    QList<QString> workIds;
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
    if (str == QLatin1String("bd") || str == QLatin1String("BD") || str == QLatin1String("Bd")) return MediaType::BD;
    if (str == QLatin1String("dvd") || str == QLatin1String("DVD") || str == QLatin1String("Dvd")) return MediaType::DVD;
    if (str == QLatin1String("cd") || str == QLatin1String("CD") || str == QLatin1String("Cd")) return MediaType::CD;
    if (str == QLatin1String("scan") || str == QLatin1String("SCAN") || str == QLatin1String("Scan")) return MediaType::Scan;
    return MediaType::Unknown;
}

struct Media {
    QString id;
    QString volumeId;
    qint32 mediaNo = 1;
    MediaType mediaType = MediaType::BD;
    qint32 volumeNo = 0;
    QString catalogNo;
    QString contentTitle;
    QString description;
    bool isDeleted = false;
    qint64 createdAt = 0;
    qint64 updatedAt = 0;
    QList<QString> fileIds;
};

struct Work {
    QString id;

    // Bangumi API 原始字段 (bangumi.ts 中 BddbWork)
    qint32 bangumiSubjectId = 0; // Bangumi subject ID (TS中的 id)
    QString url;
    qint32 type = 2; // 条目类型 (1=书籍, 2=动画, 3=音乐, 4=游戏, 6=三次元)
    QString name;
    QString nameCn;
    QString summary;
    qint32 eps = 0;
    QString airDate;
    qint32 airWeekday = 0;

    BangumiImages images;
    BangumiRating rating;
    qint32 rank = 0;
    BangumiCollection collection;
    QList<BangumiCharacter> characters;
    QList<BangumiStaff> staff;

    qint64 createdAt = 0;
    qint64 updatedAt = 0;
};

struct Product {
    QString id;
    QString productId; // 商品ID (如 "109001543001")
    QString title;
    QString url;
    QList<QString> images;
    QString noteRaw; // 描述 (HTML格式)
    QList<TrackList> tracklist;
    ProductAttributes attributes;

    // Search doc 简化字段
    QString manufacturer;
    QList<QString> voiceActors;
    QList<QString> artists;
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
    qreal progress = 0.0;
};

struct VolumeListParams {
    qint32 page = 1;
    qint32 pageSize = 20;
    QString searchCatalogNo;
    QString searchTitle;
    bool filterHasWork = false;
    bool filterHasMedia = false;
    bool useFilterHasWork = false; // 是否启用 filterHasWork
    bool useFilterHasMedia = false; // 是否启用 filterHasMedia
};

struct VolumeListResult {
    QList<Volume> data;
    qint32 total = 0;
    qint32 page = 1;
    qint32 pageSize = 20;
};

struct NodeData {
    qint32 volumeNo = 0;
    QList<qint32> sharedVolumeNos;
    QList<QString> files;

    qint32 mediaNo = 0;
    MediaType mediaType = MediaType::BD;
    QList<qint32> sharedMedias;
};

// ==================== Bangumi 离线数据库文档类型 ====================

struct BangumiSubjectDoc {
    qint32 id = 0;
    QString name;
    QString nameCn;
    qint32 type = 0;
    QString summary;
    bool nsfw = false;
    QString date;
    qreal score = 0.0;
    qint32 rank = 0;
    QMap<QString, qint32> scoreDetails;
    qint32 wish = 0;
    qint32 collect = 0;
    qint32 doing = 0;
    qint32 onHold = 0;
    qint32 dropped = 0;
};

struct BangumiStaffItem {
    qint32 personId = 0;
    QString name;
    QString nameCn;
    QString position;
    QString url;
};

struct BangumiCharacterItem {
    qint32 characterId = 0;
    QString name;
    QString nameCn;
    qint32 roleType = 0;
    qint32 order = 0;
    QString url;
};

struct BangumiSubjectRelationItem {
    qint32 subjectId = 0;
    QString name;
    QString nameCn;
    QString relationType;
    QString url;
};

struct BangumiEpisodeDoc {
    qint32 id = 0;
    qint32 subjectId = 0;
    qint32 type = 0;
    QString name;
    QString nameCn;
    qint32 sort = 0;
    QString airdate;
    QString duration;
    QString description;
    qint32 disc = 0;
};

struct BangumiSubjectDetail : BangumiSubjectDoc {
    QList<BangumiStaffItem> staff;
    QList<BangumiCharacterItem> characters;
    QList<BangumiEpisodeDoc> episodes;
    QList<BangumiSubjectRelationItem> relations;
};

#endif // MODELS_H
