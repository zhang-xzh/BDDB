#include "search/meilisearchclient.h"

#include <QNetworkAccessManager>
#include <QNetworkReply>
#include <QNetworkRequest>
#include <QUrl>
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <QEventLoop>
#include <QTimer>

class MeiliSearchClient::Impl {
public:
    std::unique_ptr<QNetworkAccessManager> networkManager;
    MeiliConfig config;
    bool connected = false;

    explicit Impl() : networkManager(std::make_unique<QNetworkAccessManager>()) {}

    [[nodiscard]] QString buildUrl(const QString& path) const {
        return config.host + path;
    }

    [[nodiscard]] QNetworkRequest createRequest(const QString& path) const {
        QNetworkRequest request{QUrl(buildUrl(path))};
        request.setHeader(QNetworkRequest::ContentTypeHeader, "application/json");
        if (!config.apiKey.isEmpty()) {
            request.setRawHeader("Authorization", "Bearer " + config.apiKey.toUtf8());
        }
        return request;
    }

    std::expected<QByteArray, QString> post(const QString& path, const QByteArray& data) const {
        QNetworkReply* reply = networkManager->post(createRequest(path), data);
        
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

    std::expected<QByteArray, QString> get(const QString& path) const {
        QNetworkReply* reply = networkManager->get(createRequest(path));
        
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

    std::expected<QByteArray, QString> del(const QString& path) const {
        QNetworkReply* reply = networkManager->deleteResource(createRequest(path));
        
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
};

MeiliSearchClient& MeiliSearchClient::instance() {
    static MeiliSearchClient instance;
    return instance;
}

bool MeiliSearchClient::connect(const MeiliConfig& config) {
    if (!m_impl) {
        m_impl = std::make_unique<Impl>();
    }
    m_impl->config = config;
    
    auto result = health();
    m_impl->connected = result.has_value();
    return m_impl->connected;
}

bool MeiliSearchClient::isConnected() const {
    return m_impl && m_impl->connected;
}

SearchResult<void> MeiliSearchClient::health() const {
    if (!m_impl) return std::unexpected(QStringLiteral("Client not initialized"));
    
    auto result = m_impl->get(QStringLiteral("/health"));
    if (!result) return std::unexpected(result.error());
    
    QJsonDocument doc = QJsonDocument::fromJson(*result);
    if (!doc.isObject()) return std::unexpected(QStringLiteral("Invalid health response"));
    
    QJsonObject obj = doc.object();
    QString status = obj["status"].toString();
    if (status != QStringLiteral("available")) {
        return std::unexpected(QStringLiteral("Meilisearch not available: ") + status);
    }
    
    return {};
}

SearchResult<void> MeiliSearchClient::createIndex(const QString& indexName, const QString& primaryKey) {
    if (!m_impl) return std::unexpected(QStringLiteral("Client not initialized"));
    
    QJsonObject obj;
    obj["uid"] = indexName;
    obj["primaryKey"] = primaryKey;
    
    QJsonDocument doc(obj);
    auto result = m_impl->post(QStringLiteral("/indexes"), doc.toJson());
    
    if (!result) return std::unexpected(result.error());
    return {};
}

SearchResult<void> MeiliSearchClient::deleteIndex(const QString& indexName) {
    if (!m_impl) return std::unexpected(QStringLiteral("Client not initialized"));
    
    QString path = QStringLiteral("/indexes/%1").arg(indexName);
    auto result = m_impl->del(path);
    
    if (!result) return std::unexpected(result.error());
    return {};
}

SearchResult<bool> MeiliSearchClient::indexExists(const QString& indexName) const {
    if (!m_impl) return std::unexpected(QStringLiteral("Client not initialized"));
    
    QString path = QStringLiteral("/indexes/%1").arg(indexName);
    auto result = m_impl->get(path);
    
    if (!result) {
        if (result.error().contains(QStringLiteral("404"))) {
            return false;
        }
        return std::unexpected(result.error());
    }
    return true;
}

SearchResult<IndexStats> MeiliSearchClient::getIndexStats(const QString& indexName) const {
    if (!m_impl) return std::unexpected(QStringLiteral("Client not initialized"));
    
    QString path = QStringLiteral("/indexes/%1/stats").arg(indexName);
    auto result = m_impl->get(path);
    
    if (!result) return std::unexpected(result.error());
    
    QJsonDocument doc = QJsonDocument::fromJson(*result);
    if (!doc.isObject()) return std::unexpected(QStringLiteral("Invalid stats response"));
    
    QJsonObject obj = doc.object();
    IndexStats stats;
    stats.totalDocuments = obj["numberOfDocuments"].toInt();
    stats.isIndexing = obj["isIndexing"].toBool();
    
    return stats;
}

SearchResult<void> MeiliSearchClient::addDocuments(const QString& indexName, const QString& jsonDocuments) {
    if (!m_impl) return std::unexpected(QStringLiteral("Client not initialized"));
    
    QString path = QStringLiteral("/indexes/%1/documents").arg(indexName);
    auto result = m_impl->post(path, jsonDocuments.toUtf8());
    
    if (!result) return std::unexpected(result.error());
    return {};
}

SearchResult<void> MeiliSearchClient::deleteDocument(const QString& indexName, const QString& documentId) {
    if (!m_impl) return std::unexpected(QStringLiteral("Client not initialized"));
    
    QString path = QStringLiteral("/indexes/%1/documents/%2").arg(indexName).arg(documentId);
    auto result = m_impl->del(path);
    
    if (!result) return std::unexpected(result.error());
    return {};
}

SearchResult<void> MeiliSearchClient::deleteAllDocuments(const QString& indexName) {
    if (!m_impl) return std::unexpected(QStringLiteral("Client not initialized"));
    
    QString path = QStringLiteral("/indexes/%1/documents").arg(indexName);
    auto result = m_impl->del(path);
    
    if (!result) return std::unexpected(result.error());
    return {};
}

SearchResult<QString> MeiliSearchClient::searchRaw(
    const QString& indexName,
    const QString& query,
    qint32 offset,
    qint32 limit,
    const QList<QString>& filter,
    const QList<QString>& sort
) const {
    if (!m_impl) return std::unexpected(QStringLiteral("Client not initialized"));
    
    QJsonObject obj;
    obj["q"] = query;
    obj["offset"] = offset;
    obj["limit"] = limit;
    
    if (!filter.isEmpty()) {
        QJsonArray filterArray;
        for (const auto& f : filter) {
            filterArray.append(f);
        }
        obj["filter"] = filterArray;
    }
    
    if (!sort.isEmpty()) {
        QJsonArray sortArray;
        for (const auto& s : sort) {
            sortArray.append(s);
        }
        obj["sort"] = sortArray;
    }
    
    QString path = QStringLiteral("/indexes/%1/search").arg(indexName);
    QJsonDocument doc(obj);
    auto result = m_impl->post(path, doc.toJson());
    
    if (!result) return std::unexpected(result.error());
    return QString::fromUtf8(*result);
}
