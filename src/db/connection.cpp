#include "db/connection.h"

#include <mongocxx/instance.hpp>
#include <mongocxx/uri.hpp>
#include <cstdlib>

MongoConnection::MongoConnection() {
    static mongocxx::instance inst{};
}

MongoConnection::~MongoConnection() = default;

MongoConnection &MongoConnection::instance() {
    static MongoConnection conn;
    return conn;
}

bool MongoConnection::connect(const std::string &uri) {
    try {
        m_client = std::make_unique<mongocxx::client>(mongocxx::uri(uri));
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

mongocxx::database MongoConnection::database(const std::string &name) {
    return (*m_client)[name];
}


