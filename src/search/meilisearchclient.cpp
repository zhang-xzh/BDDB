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
        return QString::fromStdString(config.host) + path;
    }

    [[nodiscard]] QNetworkRequest createRequest(const QString& path) const {
        QNetworkRequest request{QUrl(buildUrl(path))};
        request.setHeader(QNetworkRequest::ContentTypeHeader, "application/json");
        if (!config.apiKey.empty()) {
            request.setRawHeader("Authorization", "Bearer " + QByteArray::fromStdString(config.apiKey));
        }
        return request;
    }

    // 同步 POST 请求
    std::expected<QByteArray, std::string> post(const QString& path, const QByteArray& data) const {
        QNetworkReply* reply = networkManager->post(createRequest(path), data);
        
        QEventLoop loop;
        QObject::connect(reply, &QNetworkReply::finished, &loop, &QEventLoop::quit);
        QTimer::singleShot(30000, &loop, &QEventLoop::quit); // 30s timeout
        loop.exec();

        if (reply->error() != QNetworkReply::NoError) {
            std::string error = reply->errorString().toStdString();
            reply->deleteLater();
            return std::unexpected(error);
        }

        QByteArray result = reply->readAll();
        reply->deleteLater();
        return result;
    }

    // 同步 GET 请求
    std::expected<QByteArray, std::string> get(const QString& path) const {
        QNetworkReply* reply = networkManager->get(createRequest(path));
        
        QEventLoop loop;
        QObject::connect(reply, &QNetworkReply::finished, &loop, &QEventLoop::quit);
        QTimer::singleShot(30000, &loop, &QEventLoop::quit);
        loop.exec();

        if (reply->error() != QNetworkReply::NoError) {
            std::string error = reply->errorString().toStdString();
            reply->deleteLater();
            return std::unexpected(error);
        }

        QByteArray result = reply->readAll();
        reply->deleteLater();
        return result;
    }

    // 同步 DELETE 请求
    std::expected<QByteArray, std::string> del(const QString& path) const {
        QNetworkReply* reply = networkManager->deleteResource(createRequest(path));
        
        QEventLoop loop;
        QObject::connect(reply, &QNetworkReply::finished, &loop, &QEventLoop::quit);
        QTimer::singleShot(30000, &loop, &QEventLoop::quit);
        loop.exec();

        if (reply->error() != QNetworkReply::NoError) {
            std::string error = reply->errorString().toStdString();
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
    if (!m_impl) return std::unexpected("Client not initialized");
    
    auto result = m_impl->get("/health");
    if (!result) return std::unexpected(result.error());
    
    QJsonDocument doc = QJsonDocument::fromJson(*result);
    if (!doc.isObject()) return std::unexpected("Invalid health response");
    
    QJsonObject obj = doc.object();
    QString status = obj["status"].toString();
    if (status != "available") {
        return std::unexpected("Meilisearch not available: " + status.toStdString());
    }
    
    return {};
}

SearchResult<void> MeiliSearchClient::createIndex(const std::string& indexName, const std::string& primaryKey) {
    if (!m_impl) return std::unexpected("Client not initialized");
    
    QJsonObject obj;
    obj["uid"] = QString::fromStdString(indexName);
    obj["primaryKey"] = QString::fromStdString(primaryKey);
    
    QJsonDocument doc(obj);
    auto result = m_impl->post("/indexes", doc.toJson());
    
    if (!result) return std::unexpected(result.error());
    return {};
}

SearchResult<void> MeiliSearchClient::deleteIndex(const std::string& indexName) {
    if (!m_impl) return std::unexpected("Client not initialized");
    
    QString path = QString("/indexes/%1").arg(QString::fromStdString(indexName));
    auto result = m_impl->del(path);
    
    if (!result) return std::unexpected(result.error());
    return {};
}

SearchResult<bool> MeiliSearchClient::indexExists(const std::string& indexName) const {
    if (!m_impl) return std::unexpected("Client not initialized");
    
    QString path = QString("/indexes/%1").arg(QString::fromStdString(indexName));
    auto result = m_impl->get(path);
    
    if (!result) {
        // 404 means index doesn't exist
        if (result.error().find("404") != std::string::npos) {
            return false;
        }
        return std::unexpected(result.error());
    }
    return true;
}

SearchResult<IndexStats> MeiliSearchClient::getIndexStats(const std::string& indexName) const {
    if (!m_impl) return std::unexpected("Client not initialized");
    
    QString path = QString("/indexes/%1/stats").arg(QString::fromStdString(indexName));
    auto result = m_impl->get(path);
    
    if (!result) return std::unexpected(result.error());
    
    QJsonDocument doc = QJsonDocument::fromJson(*result);
    if (!doc.isObject()) return std::unexpected("Invalid stats response");
    
    QJsonObject obj = doc.object();
    IndexStats stats;
    stats.totalDocuments = obj["numberOfDocuments"].toInt();
    stats.isIndexing = obj["isIndexing"].toBool();
    
    return stats;
}

SearchResult<void> MeiliSearchClient::addDocuments(const std::string& indexName, const std::string& jsonDocuments) {
    if (!m_impl) return std::unexpected("Client not initialized");
    
    QString path = QString("/indexes/%1/documents").arg(QString::fromStdString(indexName));
    auto result = m_impl->post(path, QByteArray::fromStdString(jsonDocuments));
    
    if (!result) return std::unexpected(result.error());
    return {};
}

SearchResult<void> MeiliSearchClient::deleteDocument(const std::string& indexName, const std::string& documentId) {
    if (!m_impl) return std::unexpected("Client not initialized");
    
    QString path = QString("/indexes/%1/documents/%2")
        .arg(QString::fromStdString(indexName))
        .arg(QString::fromStdString(documentId));
    auto result = m_impl->del(path);
    
    if (!result) return std::unexpected(result.error());
    return {};
}

SearchResult<void> MeiliSearchClient::deleteAllDocuments(const std::string& indexName) {
    if (!m_impl) return std::unexpected("Client not initialized");
    
    QString path = QString("/indexes/%1/documents").arg(QString::fromStdString(indexName));
    auto result = m_impl->del(path);
    
    if (!result) return std::unexpected(result.error());
    return {};
}

SearchResult<std::string> MeiliSearchClient::searchRaw(
    const std::string& indexName,
    const std::string& query,
    int offset,
    int limit,
    const std::vector<std::string>& filter,
    const std::vector<std::string>& sort
) const {
    if (!m_impl) return std::unexpected("Client not initialized");
    
    QJsonObject obj;
    obj["q"] = QString::fromStdString(query);
    obj["offset"] = offset;
    obj["limit"] = limit;
    
    if (!filter.empty()) {
        QJsonArray filterArray;
        for (const auto& f : filter) {
            filterArray.append(QString::fromStdString(f));
        }
        obj["filter"] = filterArray;
    }
    
    if (!sort.empty()) {
        QJsonArray sortArray;
        for (const auto& s : sort) {
            sortArray.append(QString::fromStdString(s));
        }
        obj["sort"] = sortArray;
    }
    
    QString path = QString("/indexes/%1/search").arg(QString::fromStdString(indexName));
    QJsonDocument doc(obj);
    auto result = m_impl->post(path, doc.toJson());
    
    if (!result) return std::unexpected(result.error());
    return std::string(result->constData(), result->size());
}
