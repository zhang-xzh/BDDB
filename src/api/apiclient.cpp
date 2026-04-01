#include "api/apiclient.h"
#include <QNetworkRequest>
#include <QNetworkReply>
#include <QJsonDocument>

ApiClient::ApiClient(QObject *parent)
    : QObject(parent)
    , m_manager(new QNetworkAccessManager(this)) {
}

void ApiClient::get(const QUrl &url, const Callback &callback) {
    QNetworkRequest req(url);
    req.setHeader(QNetworkRequest::ContentTypeHeader, "application/json");
    auto *reply = m_manager->get(req);
    connect(reply, &QNetworkReply::finished, this, [reply, callback]() {
        bool ok = reply->error() == QNetworkReply::NoError;
        QJsonDocument doc;
        if (ok) {
            doc = QJsonDocument::fromJson(reply->readAll());
        }
        callback(ok, doc);
        reply->deleteLater();
    });
}

void ApiClient::post(const QUrl &url, const QJsonObject &body, const Callback &callback) {
    post(url, QJsonDocument(body).toJson(), "application/json", callback);
}

void ApiClient::post(const QUrl &url, const QByteArray &body, const QString &contentType, const Callback &callback) {
    QNetworkRequest req(url);
    req.setHeader(QNetworkRequest::ContentTypeHeader, contentType.toUtf8());
    auto *reply = m_manager->post(req, body);
    connect(reply, &QNetworkReply::finished, this, [reply, callback]() {
        bool ok = reply->error() == QNetworkReply::NoError;
        QJsonDocument doc;
        if (ok) {
            doc = QJsonDocument::fromJson(reply->readAll());
        }
        callback(ok, doc);
        reply->deleteLater();
    });
}
