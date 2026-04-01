#include "db/connection.h"

#ifdef HAVE_MONGODB

#include <mongocxx/instance.hpp>
#include <mongocxx/uri.hpp>

MongoConnection::MongoConnection() {
    static mongocxx::instance inst{};
}

MongoConnection::~MongoConnection() = default;

MongoConnection& MongoConnection::instance() {
    static MongoConnection conn;
    return conn;
}

bool MongoConnection::connect(const QString &uri) {
    try {
        m_client = std::make_unique<mongocxx::client>(mongocxx::uri(uri.toStdString()));
        m_connected = true;
        return true;
    } catch (...) {
        m_connected = false;
        return false;
    }
}

bool MongoConnection::isConnected() const {
    return m_connected;
}

mongocxx::database MongoConnection::database(const QString &name) {
    return (*m_client)[name.toStdString()];
}

QString resolveBddbDbName() {
    const QByteArray env = qgetenv("NODE_ENV");
    if (env == "production") {
        const QByteArray prod = qgetenv("MONGO_DB_PROD");
        return prod.isEmpty() ? QStringLiteral("bddb_prod") : QString::fromUtf8(prod);
    }
    if (env == "test") {
        const QByteArray test = qgetenv("MONGO_DB_TEST");
        return test.isEmpty() ? QStringLiteral("bddb_test") : QString::fromUtf8(test);
    }
    const QByteArray dev = qgetenv("MONGO_DB_DEV");
    return dev.isEmpty() ? QStringLiteral("bddb_dev") : QString::fromUtf8(dev);
}

#endif // HAVE_MONGODB
