#ifndef QBITTORRENTCLIENT_H
#define QBITTORRENTCLIENT_H

#include "models/models.h"
#include <QObject>
#include <QString>
#include <QUrl>
#include <QList>
#include <QMap>
#include <expected>
#include <optional>
#include <functional>

class QNetworkAccessManager;
class QNetworkReply;

// qBittorrent API 响应结果
template<typename T>
using QbResult = std::expected<T, QString>;

// 同步结果
struct TorrentSyncResult {
    bool success = false;
    qint32 newCount = 0;
    qint32 updateCount = 0;
    qint32 total = 0;
    QString error;

    bool operator==(const TorrentSyncResult&) const = default;
};

// 进度回调
using TorrentSyncProgressCallback = std::function<void(qint32 current, qint32 total, const QString& message)>;

class QBittorrentClient : public QObject {
    Q_OBJECT

public:
    explicit QBittorrentClient(QObject *parent = nullptr);
    ~QBittorrentClient();

    // 配置
    void setBaseUrl(const QString &url);
    void setCredentials(const QString &username, const QString &password);

    // 连接测试
    QbResult<void> testConnection();

    // ========== Torrent API ==========
    
    // 获取所有种子列表
    QbResult<QList<Torrent>> listTorrents();
    
    // 根据 hash 获取单个种子详情
    QbResult<Torrent> getTorrent(const QString &hash);
    
    // 获取种子文件列表
    QbResult<QList<TorrentFile>> getTorrentFiles(const QString &hash);
    
    // 获取多个种子的文件列表
    QbResult<QMap<QString, QList<TorrentFile>>> getMultipleTorrentFiles(
        const QList<QString> &hashes,
        std::optional<TorrentSyncProgressCallback> onProgress = std::nullopt
    );

    // ========== 同步功能 ==========
    
    // 同步所有种子到 MongoDB
    TorrentSyncResult syncTorrents(
        std::optional<TorrentSyncProgressCallback> onProgress = std::nullopt
    );

    // 同步单个种子
    QbResult<bool> syncSingleTorrent(const QString &hash);

    // 静态工具函数
    static QString defaultBaseUrl();
    static QString torrentUrl(const QString &hash);

private:
    QNetworkAccessManager *m_manager = nullptr;
    QString m_baseUrl;
    QString m_username;
    QString m_password;
    QString m_cookie;
    bool m_authenticated = false;

    // 内部 HTTP 请求方法
    QbResult<QByteArray> get(const QString &path);
    QbResult<QByteArray> post(const QString &path, const QByteArray &data = {});
    
    // 认证
    QbResult<void> authenticate();
    
    // 解析响应
    Torrent parseTorrent(const QJsonObject &obj);
    TorrentFile parseTorrentFile(const QJsonObject &obj);
};

#endif // QBITTORRENTCLIENT_H
