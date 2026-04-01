#ifndef BDDBCLIENT_H
#define BDDBCLIENT_H

#include <QObject>
#include <QUrl>
#include "models/models.h"

class ApiClient;

class BddbClient : public QObject {
    Q_OBJECT

public:
    explicit BddbClient(QObject *parent = nullptr);

    // qBittorrent
    void fetchTorrents(std::function<void(bool, QVector<Torrent>)> callback);
    void fetchTorrentFiles(const QString &hash, std::function<void(bool, QVector<TorrentFile>)> callback);

    // Meilisearch product
    void searchProducts(const QString &query, std::function<void(bool, QVector<Product>)> callback);

    // Bangumi / works (via Meilisearch or local API)
    void searchWorks(const QString &query, std::function<void(bool, QVector<Work>)> callback);

    // Config helpers
    static QUrl qbittorrentUrl();
    static QUrl meilisearchUrl();
    static QString bangumiSubjectUrl(int subjectId);

private:
    ApiClient *m_api = nullptr;
};

#endif // BDDBCLIENT_H
