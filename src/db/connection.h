#ifndef CONNECTION_H
#define CONNECTION_H

#ifdef HAVE_MONGODB

#include <memory>
#include <QString>
#include <mongocxx/client.hpp>
#include <mongocxx/database.hpp>

class MongoConnection {
public:
    static MongoConnection& instance();

    bool connect(const QString &uri = QStringLiteral("mongodb://localhost:27017"));
    bool isConnected() const;

    mongocxx::database database(const QString &name);

private:
    MongoConnection();
    ~MongoConnection();
    MongoConnection(const MongoConnection&) = delete;
    MongoConnection& operator=(const MongoConnection&) = delete;

    std::unique_ptr<mongocxx::client> m_client;
    bool m_connected = false;
};

QString resolveBddbDbName();

#endif // HAVE_MONGODB

#endif // CONNECTION_H
