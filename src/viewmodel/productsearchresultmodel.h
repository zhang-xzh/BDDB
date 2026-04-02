#ifndef PRODUCTSEARCHRESULTMODEL_H
#define PRODUCTSEARCHRESULTMODEL_H

#include <QAbstractTableModel>

class ProductSearchResultModel : public QAbstractTableModel {
    Q_OBJECT

public:
    enum Roles {
        CodeRole = Qt::UserRole + 1,
        TitleRole,
        PriceRole,
        UrlRole
    };
    Q_ENUM(Roles)

    explicit ProductSearchResultModel(QObject *parent = nullptr);

    int rowCount(const QModelIndex &parent = QModelIndex()) const override;
    int columnCount(const QModelIndex &parent = QModelIndex()) const override;
    QVariant data(const QModelIndex &index, int role = Qt::DisplayRole) const override;
    QVariant headerData(int section, Qt::Orientation orientation, int role = Qt::DisplayRole) const override;
    QHash<int, QByteArray> roleNames() const override;

    void clear();
    void addResult(const QString &code, const QString &title, int price, const QString &url);

private:
    struct Product {
        QString code;
        QString title;
        int price = 0;
        QString url;
    };
    QList<Product> m_products;
};

#endif // PRODUCTSEARCHRESULTMODEL_H
