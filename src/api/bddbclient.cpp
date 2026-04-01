#include "api/bddbclient.h"
#include "api/apiclient.h"
#include <QJsonArray>
#include <QJsonObject>
#include <QSettings>
#include <QUrlQuery>

BddbClient::BddbClient(QObject *parent)
    : QObject(parent)
    , m_api(new ApiClient(this)) {
}

QUrl BddbClient::qbittorrentUrl() {
    QSettings s;
    QString host = s.value("qb/host", "http://localhost:8080").toString();
    return QUrl(host);
}

QUrl BddbClient::meilisearchUrl() {
    QSettings s;
    QString host = s.value("meili/host", "http://localhost:7700").toString();
    return QUrl(host);
}

QString BddbClient::bangumiSubjectUrl(int subjectId) {
    return QStringLiteral("https://bgm.tv/subject/%1").arg(subjectId);
}

void BddbClient::fetchTorrents(std::function<void(bool, QVector<Torrent>)> callback) {
    QUrl url(qbittorrentUrl());
    url.setPath("/api/v2/torrents/info");
    m_api->get(url, [callback](bool ok, const QJsonDocument &doc) {
        QVector<Torrent> list;
        if (ok && doc.isArray()) {
            for (const auto &v : doc.array()) {
                auto obj = v.toObject();
                Torrent t;
                t.hash = obj.value("hash").toString();
                t.name = obj.value("name").toString();
                t.size = obj.value("size").toVariant().toLongLong();
                t.progress = obj.value("progress").toDouble();
                t.state = obj.value("state").toString();
                t.addedOn = obj.value("added_on").toVariant().toLongLong();
                t.numSeeds = obj.value("num_seeds").toVariant().toInt();
                t.numLeechs = obj.value("num_leechs").toVariant().toInt();
                t.completionOn = obj.value("completion_on").toVariant().toLongLong();
                t.savePath = obj.value("save_path").toString();
                t.uploaded = obj.value("uploaded").toVariant().toLongLong();
                t.downloaded = obj.value("downloaded").toVariant().toLongLong();
                t.category = obj.value("category").toString();
                t.tags = obj.value("tags").toString();
                t.contentPath = obj.value("content_path").toString();
                t.downloadPath = obj.value("download_path").toString();
                t.infohashV1 = obj.value("infohash_v1").toString();
                t.infohashV2 = obj.value("infohash_v2").toString();
                t.comment = obj.value("comment").toString();
                t.hasMetadata = obj.value("has_metadata").toBool();
                t.inactiveSeedingTimeLimit = obj.value("inactive_seeding_time_limit").toInt();
                t.maxInactiveSeedingTime = obj.value("max_inactive_seeding_time").toInt();
                t.popularity = obj.value("popularity").toDouble();
                t.isPrivate = obj.value("private").toBool();
                t.rootPath = obj.value("root_path").toString();
                t.amountLeft = obj.value("amount_left").toVariant().toLongLong();
                t.autoTmm = obj.value("auto_tmm").toBool();
                t.availability = obj.value("availability").toDouble();
                t.completed = obj.value("completed").toVariant().toLongLong();
                t.dlLimit = obj.value("dl_limit").toInt();
                t.dlSpeed = obj.value("dlspeed").toVariant().toLongLong();
                t.downloadedSession = obj.value("downloaded_session").toVariant().toLongLong();
                t.eta = obj.value("eta").toVariant().toLongLong();
                t.fLPiecePrio = obj.value("f_l_piece_prio").toBool();
                t.forceStart = obj.value("force_start").toBool();
                t.lastActivity = obj.value("last_activity").toVariant().toLongLong();
                t.magnetUri = obj.value("magnet_uri").toString();
                t.maxRatio = obj.value("max_ratio").toDouble();
                t.maxSeedingTime = obj.value("max_seeding_time").toInt();
                t.numComplete = obj.value("num_complete").toInt();
                t.numIncomplete = obj.value("num_incomplete").toInt();
                t.priority = obj.value("priority").toInt();
                t.ratio = obj.value("ratio").toDouble();
                t.ratioLimit = obj.value("ratio_limit").toDouble();
                t.reannounce = obj.value("reannounce").toInt();
                t.seedingTime = obj.value("seeding_time").toVariant().toLongLong();
                t.seedingTimeLimit = obj.value("seeding_time_limit").toInt();
                t.seenComplete = obj.value("seen_complete").toVariant().toLongLong();
                t.seqDl = obj.value("seq_dl").toBool();
                t.superSeeding = obj.value("super_seeding").toBool();
                t.timeActive = obj.value("time_active").toVariant().toLongLong();
                t.totalSize = obj.value("total_size").toVariant().toLongLong();
                t.tracker = obj.value("tracker").toString();
                t.trackersCount = obj.value("trackers_count").toInt();
                t.upLimit = obj.value("up_limit").toInt();
                t.uploadedSession = obj.value("uploaded_session").toVariant().toLongLong();
                t.upSpeed = obj.value("upspeed").toVariant().toLongLong();
                list.append(t);
            }
        }
        callback(ok, list);
    });
}

void BddbClient::fetchTorrentFiles(const QString &hash, std::function<void(bool, QVector<TorrentFile>)> callback) {
    QUrl url(qbittorrentUrl());
    url.setPath("/api/v2/torrents/files");
    QUrlQuery query;
    query.addQueryItem("hash", hash);
    url.setQuery(query);
    m_api->get(url, [callback](bool ok, const QJsonDocument &doc) {
        QVector<TorrentFile> list;
        if (ok && doc.isArray()) {
            int idx = 0;
            for (const auto &v : doc.array()) {
                auto obj = v.toObject();
                TorrentFile f;
                f.name = obj.value("name").toString();
                f.size = obj.value("size").toVariant().toLongLong();
                f.progress = obj.value("progress").toDouble();
                f.index = idx++;
                f.priority = obj.value("priority").toInt();
                f.isSeed = obj.value("is_seed").toBool();
                f.availability = obj.value("availability").toDouble();
                list.append(f);
            }
        }
        callback(ok, list);
    });
}

void BddbClient::searchProducts(const QString &query, std::function<void(bool, QVector<Product>)> callback) {
    QUrl url(meilisearchUrl());
    url.setPath("/indexes/products/search");
    QJsonObject body;
    body["q"] = query;
    m_api->post(url, body, [callback](bool ok, const QJsonDocument &doc) {
        QVector<Product> list;
        if (ok && doc.isObject()) {
            auto hits = doc.object().value("hits").toArray();
            for (const auto &v : hits) {
                auto obj = v.toObject();
                Product p;
                p.id = obj.value("id").toString();
                p.productId = obj.value("product_id").toString();
                p.title = obj.value("title").toString();
                p.price = obj.value("price").toVariant().toString();
                p.url = obj.value("url").toString();
                p.manufacturer = obj.value("manufacturer").toString();
                p.modelNumber = obj.value("model_number").toString();
                p.releaseDate = obj.value("release_date").toString();
                for (const auto &img : obj.value("images").toArray()) {
                    p.images.append(img.toString());
                }
                list.append(p);
            }
        }
        callback(ok, list);
    });
}

void BddbClient::searchWorks(const QString &query, std::function<void(bool, QVector<Work>)> callback) {
    QUrl url(meilisearchUrl());
    url.setPath("/indexes/bangumi/search");
    QJsonObject body;
    body["q"] = query;
    m_api->post(url, body, [callback](bool ok, const QJsonDocument &doc) {
        QVector<Work> list;
        if (ok && doc.isObject()) {
            auto hits = doc.object().value("hits").toArray();
            for (const auto &v : hits) {
                auto obj = v.toObject();
                Work w;
                w.id = obj.value("id").toString();
                w.bangumiSubjectId = obj.value("subject_id").toVariant().toInt();
                w.name = obj.value("name").toString();
                w.nameCn = obj.value("name_cn").toString();
                w.airDate = obj.value("air_date").toString();
                w.type = obj.value("type").toInt(2);
                list.append(w);
            }
        }
        callback(ok, list);
    });
}
