#include "db/bsonutils.h"

#include <bsoncxx/types.hpp>
#include <bsoncxx/builder/basic/document.hpp>
#include <bsoncxx/builder/basic/array.hpp>
#include <bsoncxx/builder/basic/kvp.hpp>

namespace BsonUtils {
    QString toQString(const bsoncxx::document::element &elem) {
        if (!elem) return {};
        switch (elem.type()) {
            case bsoncxx::type::k_string:
                return toQString(elem.get_string().value);
            case bsoncxx::type::k_int32:
                return QString::number(elem.get_int32().value);
            case bsoncxx::type::k_int64:
                return QString::number(elem.get_int64().value);
            case bsoncxx::type::k_double:
                return QString::number(elem.get_double().value);
            default:
                return {};
        }
    }

    QString toQString(const bsoncxx::stdx::string_view &sv) {
        return QString::fromUtf8(sv.data(), static_cast<qsizetype>(sv.size()));
    }

    QString oidToQString(const bsoncxx::oid &oid) {
        return QString::fromStdString(oid.to_string());
    }

    qint32 toInt32(const bsoncxx::document::element &elem) {
        if (!elem) return 0;
        switch (elem.type()) {
            case bsoncxx::type::k_int32:
                return elem.get_int32().value;
            case bsoncxx::type::k_int64:
                return static_cast<qint32>(elem.get_int64().value);
            case bsoncxx::type::k_double:
                return static_cast<qint32>(elem.get_double().value);
            default:
                return 0;
        }
    }

    qint64 toInt64(const bsoncxx::document::element &elem) {
        if (!elem) return 0;
        switch (elem.type()) {
            case bsoncxx::type::k_int64:
                return elem.get_int64().value;
            case bsoncxx::type::k_int32:
                return elem.get_int32().value;
            case bsoncxx::type::k_double:
                return static_cast<qint64>(elem.get_double().value);
            default:
                return 0;
        }
    }

    qreal toReal(const bsoncxx::document::element &elem) {
        if (!elem) return 0.0;
        switch (elem.type()) {
            case bsoncxx::type::k_double:
                return elem.get_double().value;
            case bsoncxx::type::k_int32:
                return elem.get_int32().value;
            case bsoncxx::type::k_int64:
                return static_cast<qreal>(elem.get_int64().value);
            default:
                return 0.0;
        }
    }

    bool toBool(const bsoncxx::document::element &elem) {
        if (!elem) return false;
        if (elem.type() == bsoncxx::type::k_bool)
            return elem.get_bool().value;
        return false;
    }

    QList<QString> toStringList(const bsoncxx::document::element &elem) {
        QList<QString> vec;
        if (!elem || elem.type() != bsoncxx::type::k_array) return vec;
        for (auto &&item: elem.get_array().value) {
            if (item.type() == bsoncxx::type::k_oid)
                vec.push_back(oidToQString(item.get_oid().value));
            else if (item.type() == bsoncxx::type::k_string)
                vec.push_back(toQString(item.get_string().value));
        }
        return vec;
    }

    QList<qint32> toInt32List(const bsoncxx::document::element &elem) {
        QList<qint32> vec;
        if (!elem || elem.type() != bsoncxx::type::k_array) return vec;
        for (auto &&item: elem.get_array().value) {
            if (item.type() == bsoncxx::type::k_int32)
                vec.push_back(item.get_int32().value);
            else if (item.type() == bsoncxx::type::k_int64)
                vec.push_back(static_cast<qint32>(item.get_int64().value));
        }
        return vec;
    }

    bsoncxx::oid toOid(const QString &id) {
        if (id.isEmpty()) return {};
        try {
            return bsoncxx::oid(id.toStdString());
        } catch (...) {
            return {};
        }
    }

    void appendOidArray(bsoncxx::builder::basic::document &builder, const QString &key, const QList<QString> &vec) {
        bsoncxx::builder::basic::array arr;
        for (const auto &s: vec) {
            if (!s.isEmpty()) {
                arr.append(toOid(s));
            }
        }
        builder.append(bsoncxx::builder::basic::kvp(key.toStdString(), arr.extract()));
    }
} // namespace BsonUtils
