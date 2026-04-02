#ifndef CONNECTION_H
#define CONNECTION_H

#include <memory>
#include <string>
#include <mongocxx/client.hpp>
#include <mongocxx/database.hpp>

class MongoConnection {
public:
    static MongoConnection& instance();

    bool connect(const std::string &uri = "mongodb://localhost:27017");
    bool isConnected() const;

    mongocxx::database database(const std::string &name);

private:
    MongoConnection();
    ~MongoConnection();
    MongoConnection(const MongoConnection&) = delete;
    MongoConnection& operator=(const MongoConnection&) = delete;

    std::unique_ptr<mongocxx::client> m_client;
    bool m_connected = false;
};

#endif // CONNECTION_H
