#ifndef BSONUTILS_H
#define BSONUTILS_H

#include <QString>
#include <QList>
#include <bsoncxx/oid-fwd.hpp>
#include <bsoncxx/builder/basic/document-fwd.hpp>
#include <bsoncxx/document/view.hpp>
#include <bsoncxx/document/element.hpp>

namespace BsonUtils {
    // 字符串类型转换
    QString toQString(const bsoncxx::document::element &elem);

    QString toQString(const bsoncxx::stdx::string_view &sv);

    QString oidToQString(const bsoncxx::oid &oid);

    // 整数类型转换
    qint32 toInt32(const bsoncxx::document::element &elem);

    qint64 toInt64(const bsoncxx::document::element &elem);

    // 浮点类型转换
    qreal toReal(const bsoncxx::document::element &elem);

    // 布尔类型转换
    bool toBool(const bsoncxx::document::element &elem);

    // 数组转换
    QList<QString> toStringList(const bsoncxx::document::element &elem);

    QList<qint32> toInt32List(const bsoncxx::document::element &elem);

    // ObjectId 转换
    bsoncxx::oid toOid(const QString &id);

    // 追加 ObjectId 数组到 BSON builder
    void appendOidArray(bsoncxx::builder::basic::document &builder, const QString &key, const QList<QString> &vec);
} // namespace BsonUtils

#endif // BSONUTILS_H
