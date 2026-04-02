#include "api/qbittorrentclient.h"

#include <QNetworkAccessManager>
#include <QNetworkReply>
#include <QNetworkRequest>
#include <QUrl>
#include <QUrlQuery>
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <QEventLoop>
#include <QTimer>
#include <QThread>
#include <QtConcurrent>

#include "db/connection.h"
#include "db/bddbrepository.h"
#include <mongocxx/collection.hpp>
#include <bsoncxx/builder/basic/document.hpp>
#include <bsoncxx/builder/basic/kvp.hpp>
#include <bsoncxx/oid.hpp>

using bsoncxx::builder::basic::kvp;
using bsoncxx::builder::basic::make_document;

QBittorrentClient::QBittorrentClient(QObject *parent)
    : QObject(parent)
      , m_manager(new QNetworkAccessManager(this))
      , m_baseUrl(defaultBaseUrl()) {
}

QBittorrentClient::~QBittorrentClient() = default;

void QBittorrentClient::setBaseUrl(const QString &url) {
    m_baseUrl = url;
    if (!m_baseUrl.endsWith('/')) {
        m_baseUrl += '/';
    }
    m_authenticated = false;
}

void QBittorrentClient::setCredentials(const QString &username, const QString &password) {
    m_username = username;
    m_password = password;
    m_authenticated = false;
}

QString QBittorrentClient::defaultBaseUrl() {
    return "http://localhost:18000/";
}

QString QBittorrentClient::torrentUrl(const QString &hash) {
    Q_UNUSED(hash)
    return QString();
}

QbResult<void> QBittorrentClient::authenticate() {
    if (m_authenticated) return {};

    QUrl url(m_baseUrl + "api/v2/auth/login");
    QNetworkRequest request(url);
    request.setHeader(QNetworkRequest::ContentTypeHeader, "application/x-www-form-urlencoded");

    QByteArray data = QString("username=%1&password=%2")
            .arg(m_username, m_password)
            .toUtf8();

    QNetworkReply *reply = m_manager->post(request, data);

    QEventLoop loop;
    QObject::connect(reply, &QNetworkReply::finished, &loop, &QEventLoop::quit);
    QTimer::singleShot(10000, &loop, &QEventLoop::quit);
    loop.exec();

    if (reply->error() != QNetworkReply::NoError) {
        QString error = reply->errorString();
        reply->deleteLater();
        return std::unexpected(error);
    }

    QByteArray result = reply->readAll();
    reply->deleteLater();

    if (result == "Fails." || result == "Forbidden") {
        return std::unexpected("Authentication failed: invalid credentials");
    }

    QVariant cookieHeader = reply->header(QNetworkRequest::SetCookieHeader);
    if (cookieHeader.isValid()) {
        m_cookie = cookieHeader.toString();
        m_authenticated = true;
    }

    return {};
}

QbResult<QByteArray> QBittorrentClient::get(const QString &path) {
    auto auth = authenticate();
    if (!auth) return std::unexpected(auth.error());

    QUrl url(m_baseUrl + path);
    QNetworkRequest request(url);

    if (!m_cookie.isEmpty()) {
        request.setRawHeader("Cookie", m_cookie.toUtf8());
    }

    QNetworkReply *reply = m_manager->get(request);

    QEventLoop loop;
    QObject::connect(reply, &QNetworkReply::finished, &loop, &QEventLoop::quit);
    QTimer::singleShot(30000, &loop, &QEventLoop::quit);
    loop.exec();

    if (reply->error() != QNetworkReply::NoError) {
        QString error = reply->errorString();
        reply->deleteLater();
        return std::unexpected(error);
    }

    QByteArray result = reply->readAll();
    reply->deleteLater();
    return result;
}

QbResult<QByteArray> QBittorrentClient::post(const QString &path, const QByteArray &data) {
    auto auth = authenticate();
    if (!auth) return std::unexpected(auth.error());

    QUrl url(m_baseUrl + path);
    QNetworkRequest request(url);
    request.setHeader(QNetworkRequest::ContentTypeHeader, "application/x-www-form-urlencoded");

    if (!m_cookie.isEmpty()) {
        request.setRawHeader("Cookie", m_cookie.toUtf8());
    }

    QNetworkReply *reply = m_manager->post(request, data);

    QEventLoop loop;
    QObject::connect(reply, &QNetworkReply::finished, &loop, &QEventLoop::quit);
    QTimer::singleShot(30000, &loop, &QEventLoop::quit);
    loop.exec();

    if (reply->error() != QNetworkReply::NoError) {
        QString error = reply->errorString();
        reply->deleteLater();
        return std::unexpected(error);
    }

    QByteArray result = reply->readAll();
    reply->deleteLater();
    return result;
}

QbResult<void> QBittorrentClient::testConnection() {
    return authenticate();
}

Torrent QBittorrentClient::parseTorrent(const QJsonObject &obj) {
    Torrent t;

    auto toInt64 = [](qint64 v) { return static_cast<qint64>(v); };

    if (obj.contains("hash")) t.hash = obj["hash"].toString();
    if (obj.contains("name")) t.name = obj["name"].toString();
    if (obj.contains("size")) t.size = toInt64(obj["size"].toDouble());
    if (obj.contains("progress")) t.progress = obj["progress"].toDouble();
    if (obj.contains("state")) t.state = obj["state"].toString();
    if (obj.contains("added_on")) t.addedOn = toInt64(obj["added_on"].toDouble());
    if (obj.contains("num_seeds")) t.numSeeds = obj["num_seeds"].toInt();
    if (obj.contains("num_leechs")) t.numLeechs = obj["num_leechs"].toInt();
    if (obj.contains("completion_on")) t.completionOn = toInt64(obj["completion_on"].toDouble());
    if (obj.contains("save_path")) t.savePath = obj["save_path"].toString();
    if (obj.contains("uploaded")) t.uploaded = toInt64(obj["uploaded"].toDouble());
    if (obj.contains("downloaded")) t.downloaded = toInt64(obj["downloaded"].toDouble());
    if (obj.contains("category")) t.category = obj["category"].toString();
    if (obj.contains("tags")) t.tags = obj["tags"].toString();
    if (obj.contains("content_path")) t.contentPath = obj["content_path"].toString();
    if (obj.contains("download_path")) t.downloadPath = obj["download_path"].toString();
    if (obj.contains("infohash_v1")) t.infohashV1 = obj["infohash_v1"].toString();
    if (obj.contains("infohash_v2")) t.infohashV2 = obj["infohash_v2"].toString();
    if (obj.contains("comment")) t.comment = obj["comment"].toString();
    if (obj.contains("has_metadata")) t.hasMetadata = obj["has_metadata"].toBool();
    if (obj.contains("inactive_seeding_time_limit")) t.inactiveSeedingTimeLimit = obj["inactive_seeding_time_limit"].toInt();
    if (obj.contains("max_inactive_seeding_time")) t.maxInactiveSeedingTime = obj["max_inactive_seeding_time"].toInt();
    if (obj.contains("popularity")) t.popularity = obj["popularity"].toDouble();
    if (obj.contains("private")) t.isPrivate = obj["private"].toBool();
    if (obj.contains("root_path")) t.rootPath = obj["root_path"].toString();
    if (obj.contains("amount_left")) t.amountLeft = toInt64(obj["amount_left"].toDouble());
    if (obj.contains("auto_tmm")) t.autoTmm = obj["auto_tmm"].toBool();
    if (obj.contains("availability")) t.availability = obj["availability"].toDouble();
    if (obj.contains("completed")) t.completed = toInt64(obj["completed"].toDouble());
    if (obj.contains("dl_limit")) t.dlLimit = obj["dl_limit"].toInt();
    if (obj.contains("dlspeed")) t.dlSpeed = toInt64(obj["dlspeed"].toDouble());
    if (obj.contains("downloaded_session")) t.downloadedSession = toInt64(obj["downloaded_session"].toDouble());
    if (obj.contains("eta")) t.eta = toInt64(obj["eta"].toDouble());
    if (obj.contains("f_l_piece_prio")) t.fLPiecePrio = obj["f_l_piece_prio"].toBool();
    if (obj.contains("force_start")) t.forceStart = obj["force_start"].toBool();
    if (obj.contains("last_activity")) t.lastActivity = toInt64(obj["last_activity"].toDouble());
    if (obj.contains("magnet_uri")) t.magnetUri = obj["magnet_uri"].toString();
    if (obj.contains("max_ratio")) t.maxRatio = obj["max_ratio"].toDouble();
    if (obj.contains("max_seeding_time")) t.maxSeedingTime = obj["max_seeding_time"].toInt();
    if (obj.contains("num_complete")) t.numComplete = obj["num_complete"].toInt();
    if (obj.contains("num_incomplete")) t.numIncomplete = obj["num_incomplete"].toInt();
    if (obj.contains("priority")) t.priority = obj["priority"].toInt();
    if (obj.contains("ratio")) t.ratio = obj["ratio"].toDouble();
    if (obj.contains("ratio_limit")) t.ratioLimit = obj["ratio_limit"].toDouble();
    if (obj.contains("reannounce")) t.reannounce = obj["reannounce"].toInt();
    if (obj.contains("seeding_time")) t.seedingTime = toInt64(obj["seeding_time"].toDouble());
    if (obj.contains("seeding_time_limit")) t.seedingTimeLimit = obj["seeding_time_limit"].toInt();
    if (obj.contains("seen_complete")) t.seenComplete = toInt64(obj["seen_complete"].toDouble());
    if (obj.contains("seq_dl")) t.seqDl = obj["seq_dl"].toBool();
    if (obj.contains("super_seeding")) t.superSeeding = obj["super_seeding"].toBool();
    if (obj.contains("time_active")) t.timeActive = toInt64(obj["time_active"].toDouble());
    if (obj.contains("total_size")) t.totalSize = toInt64(obj["total_size"].toDouble());
    if (obj.contains("tracker")) t.tracker = obj["tracker"].toString();
    if (obj.contains("trackers_count")) t.trackersCount = obj["trackers_count"].toInt();
    if (obj.contains("up_limit")) t.upLimit = obj["up_limit"].toInt();
    if (obj.contains("uploaded_session")) t.uploadedSession = toInt64(obj["uploaded_session"].toDouble());
    if (obj.contains("upspeed")) t.upSpeed = toInt64(obj["upspeed"].toDouble());

    return t;
}

TorrentFile QBittorrentClient::parseTorrentFile(const QJsonObject &obj) {
    TorrentFile f;

    auto toInt64 = [](qint64 v) { return static_cast<qint64>(v); };

    if (obj.contains("index")) f.index = obj["index"].toInt();
    if (obj.contains("name")) f.name = obj["name"].toString();
    if (obj.contains("size")) f.size = toInt64(obj["size"].toDouble());
    if (obj.contains("progress")) f.progress = obj["progress"].toDouble();
    if (obj.contains("priority")) f.priority = obj["priority"].toInt();
    if (obj.contains("is_seed")) f.isSeed = obj["is_seed"].toBool();
    if (obj.contains("availability")) f.availability = obj["availability"].toDouble();
    if (obj.contains("path")) f.path = obj["path"].toString();

    return f;
}

QbResult<QList<Torrent> > QBittorrentClient::listTorrents() {
    auto result = get("api/v2/torrents/info");
    if (!result) return std::unexpected(result.error());

    QJsonDocument doc = QJsonDocument::fromJson(*result);
    if (!doc.isArray()) {
        return std::unexpected("Invalid response format: expected array");
    }

    QList<Torrent> torrents;
    QJsonArray array = doc.array();
    for (const auto &val: array) {
        if (val.isObject()) {
            torrents.push_back(parseTorrent(val.toObject()));
        }
    }

    return torrents;
}

QbResult<Torrent> QBittorrentClient::getTorrent(const QString &hash) {
    QString path = QString("api/v2/torrents/info?hashes=%1").arg(hash);
    auto result = get(path);
    if (!result) return std::unexpected(result.error());

    QJsonDocument doc = QJsonDocument::fromJson(*result);
    if (!doc.isArray() || doc.array().isEmpty()) {
        return std::unexpected("Torrent not found");
    }

    return parseTorrent(doc.array().first().toObject());
}

QbResult<QList<TorrentFile> > QBittorrentClient::getTorrentFiles(const QString &hash) {
    QString path = QString("api/v2/torrents/files?hash=%1").arg(hash);
    auto result = get(path);
    if (!result) return std::unexpected(result.error());

    QJsonDocument doc = QJsonDocument::fromJson(*result);
    if (!doc.isArray()) {
        return std::unexpected("Invalid response format: expected array");
    }

    QList<TorrentFile> files;
    QJsonArray array = doc.array();
    for (const auto &val: array) {
        if (val.isObject()) {
            files.push_back(parseTorrentFile(val.toObject()));
        }
    }

    return files;
}

QbResult<QMap<QString, QList<TorrentFile> > > QBittorrentClient::getMultipleTorrentFiles(
    const QList<QString> &hashes
) {
    QMap<QString, QList<TorrentFile> > result;

    for (qsizetype i = 0; i < hashes.size(); ++i) {
        const QString &hash = hashes[i];

        auto files = getTorrentFiles(hash);
        if (files) {
            result[hash] = std::move(*files);
        }

        if (i % 10 == 0 && i > 0) {
            QThread::msleep(100);
        }
    }

    return result;
}

QFuture<TorrentSyncResult> QBittorrentClient::syncTorrents() {
    return QtConcurrent::run([this]() -> TorrentSyncResult {
        return syncTorrentsSync();
    });
}

TorrentSyncResult QBittorrentClient::syncTorrentsSync() {
    TorrentSyncResult result;
    result.success = false;

    try {
        if (!MongoConnection::instance().isConnected()) {
            result.error = "MongoDB not connected";
            return result;
        }

        auto torrents = listTorrents();
        if (!torrents) {
            result.error = torrents.error();
            return result;
        }

        result.total = static_cast<qint32>(torrents->size());

        QList<QString> hashes;
        for (const auto &t: *torrents) {
            hashes.push_back(t.hash);
        }

        auto fileMap = getMultipleTorrentFiles(hashes);

        auto now = std::chrono::system_clock::now().time_since_epoch().count() / 1000000000;

        for (qsizetype i = 0; i < torrents->size(); ++i) {
            const auto &torrent = (*torrents)[i];
            const QString hash = torrent.hash;

            QList<TorrentFile> files;
            if (fileMap && fileMap->contains(hash)) {
                files = (*fileMap)[hash];
            }

            auto existing = BddbRepository::getTorrentByHash(torrent.hash);

            if (existing && existing->hash == torrent.hash) {
                const auto oldId = existing->id;
                const auto oldCreatedAt = existing->createdAt;
                const auto oldIsDeleted = existing->isDeleted;
                const auto oldHasVolumes = existing->hasVolumes;
                const auto oldVolumeCount = existing->volumeCount;

                Torrent updated = torrent;
                updated.id = oldId;
                updated.createdAt = oldCreatedAt;
                updated.isDeleted = oldIsDeleted;
                updated.hasVolumes = oldHasVolumes;
                updated.volumeCount = oldVolumeCount;
                updated.syncedAt = now;
                updated.updatedAt = now;

                if (!files.empty()) {
                    QList<TorrentFile> mergedFiles;
                    for (const auto &newFile: files) {
                        bool found = false;
                        for (auto &existingFile: updated.files) {
                            if (existingFile.name == newFile.name) {
                                const auto oldFileId = existingFile.id;
                                const auto oldFileCreatedAt = existingFile.createdAt;
                                existingFile = newFile;
                                existingFile.id = oldFileId;
                                existingFile.createdAt = oldFileCreatedAt;
                                existingFile.updatedAt = now;
                                mergedFiles.push_back(existingFile);
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            TorrentFile newF = newFile;
                            newF.id = QString::fromStdString(bsoncxx::oid().to_string());
                            newF.createdAt = now;
                            newF.updatedAt = now;
                            mergedFiles.push_back(newF);
                        }
                    }
                    updated.files = std::move(mergedFiles);
                }

                auto save = BddbRepository::saveTorrent(updated);
                if (save) {
                    result.updateCount++;
                }
            } else {
                Torrent newTorrent = torrent;
                newTorrent.id = QString::fromStdString(bsoncxx::oid().to_string());
                newTorrent.isDeleted = false;
                newTorrent.syncedAt = now;
                newTorrent.createdAt = now;
                newTorrent.updatedAt = now;

                for (auto &file: files) {
                    file.id = QString::fromStdString(bsoncxx::oid().to_string());
                    file.createdAt = now;
                    file.updatedAt = now;
                }
                newTorrent.files = std::move(files);

                auto save = BddbRepository::saveTorrent(newTorrent);
                if (save) {
                    result.newCount++;
                }
            }
        }

        result.success = true;
    } catch (const std::exception &e) {
        result.error = QString::fromUtf8(e.what());
    }

    return result;
}

QbResult<bool> QBittorrentClient::syncSingleTorrent(const QString &hash) {
    try {
        auto torrent = getTorrent(hash);
        if (!torrent) return std::unexpected(torrent.error());

        auto files = getTorrentFiles(hash);

        auto now = std::chrono::system_clock::now().time_since_epoch().count() / 1000000000;

        torrent->syncedAt = now;
        torrent->updatedAt = now;

        if (files) {
            for (auto &file: *files) {
                file.id = QString::fromStdString(bsoncxx::oid().to_string());
                file.createdAt = now;
                file.updatedAt = now;
            }
            torrent->files = std::move(*files);
        }

        auto result = BddbRepository::saveTorrent(*torrent);
        if (!result) return std::unexpected(result.error());

        return true;
    } catch (const std::exception &e) {
        return std::unexpected(QStringLiteral("Sync failed: ") + QString::fromUtf8(e.what()));
    }
}
