#ifndef APICLIENT_H
#define APICLIENT_H

#include <QJsonDocument>
#include <QJsonObject>
#include <QNetworkAccessManager>
#include <QNetworkReply>
#include <QObject>
#include <functional>

class ApiClient : public QObject {
    Q_OBJECT

public:
    explicit ApiClient(QObject *parent = nullptr);

    using Callback = std::function<void(bool success, const QJsonDocument &doc)>;

    void get(const QUrl &url, const Callback &callback);
    void post(const QUrl &url, const QJsonObject &body, const Callback &callback);
    void post(const QUrl &url, const QByteArray &body, const QString &contentType, const Callback &callback);

private:
    QNetworkAccessManager *m_manager = nullptr;
};

#endif // APICLIENT_H
