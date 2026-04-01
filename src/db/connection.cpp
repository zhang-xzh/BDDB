#include "db/connection.h"

#ifdef HAVE_MONGODB

#include <mongocxx/instance.hpp>
#include <mongocxx/uri.hpp>
#include <cstdlib>

MongoConnection::MongoConnection() {
    static mongocxx::instance inst{};
}

MongoConnection::~MongoConnection() = default;

MongoConnection& MongoConnection::instance() {
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

std::string resolveBddbDbName() {
    const char* env = std::getenv("NODE_ENV");
    if (!env) env = "";
    if (std::string(env) == "production") {
        const char* prod = std::getenv("MONGO_DB_PROD");
        return prod && prod[0] ? prod : "bddb_prod";
    }
    if (std::string(env) == "test") {
        const char* test = std::getenv("MONGO_DB_TEST");
        return test && test[0] ? test : "bddb_test";
    }
    const char* dev = std::getenv("MONGO_DB_DEV");
    return dev && dev[0] ? dev : "bddb_dev";
}

#endif // HAVE_MONGODB
