#ifndef SURUGAYAREPOSITORY_H
#define SURUGAYAREPOSITORY_H

#include "models/models.h"
#include <string>
#include <vector>
#include <expected>
#include <optional>

template<typename T> using DbResult = std::expected<T, std::string>;

// 分页参数
struct PaginationParams {
    int page = 1;
    int pageSize = 20;
};

// 分页结果
template<typename T>
struct PaginatedResult {
    std::vector<T> data;
    int total = 0;
    int page = 1;
    int pageSize = 20;
    int totalPages = 0;
};

// 产品查询选项
struct ProductQueryOptions {
    std::optional<std::string> catalogNo;    // 型番精确匹配
    std::optional<std::string> title;        // 标题模糊搜索
    std::optional<std::string> manufacturer; // 制造商
    PaginationParams pagination;
};

class SurugaYaRepository {
public:
    // 根据型番查找产品（精确匹配）
    static DbResult<std::vector<Product>> findProductsByCatalogNo(const std::string &catalogNo);
    
    // 根据产品ID查找
    static DbResult<std::optional<Product>> findByProductId(const std::string &productId);
    
    // 根据 MongoDB _id 查找
    static DbResult<std::optional<Product>> findById(const std::string &id);
    
    // 分页查询产品
    static DbResult<PaginatedResult<Product>> findAll(const PaginationParams& params = {});
    
    // 条件查询产品
    static DbResult<PaginatedResult<Product>> findByQuery(const ProductQueryOptions& options);
    
    // 获取产品总数
    static DbResult<int> count();
    
    // 根据标题模糊搜索
    static DbResult<std::vector<Product>> searchByTitle(const std::string& keyword, int limit = 20);
    
    // 获取所有制造商列表
    static DbResult<std::vector<std::string>> getAllManufacturers();
    
    // 根据制造商查找产品
    static DbResult<std::vector<Product>> findByManufacturer(const std::string& manufacturer, const PaginationParams& params = {});
};

#endif // SURUGAYAREPOSITORY_H
