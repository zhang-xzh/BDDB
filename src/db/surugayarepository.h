#ifndef SURUGAYAREPOSITORY_H
#define SURUGAYAREPOSITORY_H

#ifdef HAVE_MONGODB

#include "models/models.h"
#include <QVector>
#include <QString>

class SurugaYaRepository {
public:
    static QVector<Product> findProductsByCatalogNo(const QString &catalogNo);
};

#endif // HAVE_MONGODB
#endif // SURUGAYAREPOSITORY_H
