#ifndef SURUGAYAREPOSITORY_H
#define SURUGAYAREPOSITORY_H

#include "models/models.h"
#include <QString>
#include <QList>
#include <expected>
#include <optional>

template<typename T> using DbResult = std::expected<T, QString>;

// 分页参数
struct PaginationParams {
    qint32 page = 1;
    qint32 pageSize = 20;
};

// 分页结果
template<typename T>
struct PaginatedResult {
    QList<T> data;
    qint32 total = 0;
    qint32 page = 1;
    qint32 pageSize = 20;
    qint32 totalPages = 0;
};

// 产品查询选项
struct ProductQueryOptions {
    std::optional<QString> catalogNo;    // 型番精确匹配
    std::optional<QString> title;        // 标题模糊搜索
    std::optional<QString> manufacturer; // 制造商
    PaginationParams pagination;
};

class SurugaYaRepository {
public:
    // 根据型番查找产品（精确匹配）
    static DbResult<QList<Product>> findProductsByCatalogNo(const QString &catalogNo);

    // 根据产品ID查找
    static DbResult<std::optional<Product>> findByProductId(const QString &productId);

    // 根据 MongoDB _id 查找
    static DbResult<std::optional<Product>> findById(const QString &id);

    // 分页查询产品
    static DbResult<PaginatedResult<Product>> findAll(const PaginationParams& params = {});

    // 条件查询产品
    static DbResult<PaginatedResult<Product>> findByQuery(const ProductQueryOptions& options);

    // 获取产品总数
    static DbResult<qint32> count();

    // 根据标题模糊搜索
    static DbResult<QList<Product>> searchByTitle(const QString& keyword, qint32 limit = 20);

    // 获取所有制造商列表
    static DbResult<QList<QString>> getAllManufacturers();

    // 根据制造商查找产品
    static DbResult<QList<Product>> findByManufacturer(const QString& manufacturer, const PaginationParams& params = {});
};

#endif // SURUGAYAREPOSITORY_H
