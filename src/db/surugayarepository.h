#ifndef SURUGAYAREPOSITORY_H
#define SURUGAYAREPOSITORY_H

#ifdef HAVE_MONGODB

#include "models/models.h"
#include <string>
#include <vector>
#include <expected>

template<typename T> using DbResult = std::expected<T, std::string>;

class SurugaYaRepository {
public:
    static DbResult<std::vector<Product>> findProductsByCatalogNo(const std::string &catalogNo);
};

#endif // HAVE_MONGODB
#endif // SURUGAYAREPOSITORY_H
