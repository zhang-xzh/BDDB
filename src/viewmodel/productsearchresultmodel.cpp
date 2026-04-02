#include "viewmodel/productsearchresultmodel.h"

ProductSearchResultModel::ProductSearchResultModel(QObject *parent)
    : QAbstractTableModel(parent) {
}

int ProductSearchResultModel::rowCount(const QModelIndex &parent) const {
    if (parent.isValid()) return 0;
    return m_products.size();
}

int ProductSearchResultModel::columnCount(const QModelIndex &parent) const {
    if (parent.isValid()) return 0;
    return 4; // code, title, price, url
}

QVariant ProductSearchResultModel::data(const QModelIndex &index, int role) const {
    if (!index.isValid() || index.row() >= m_products.size())
        return QVariant();

    const auto &product = m_products.at(index.row());

    if (role == Qt::DisplayRole || role == Qt::EditRole) {
        switch (index.column()) {
            case 0: return product.code;
            case 1: return product.title;
            case 2: return product.price;
            case 3: return product.url;
            default: return QVariant();
        }
    }

    if (role == CodeRole) return product.code;
    if (role == TitleRole) return product.title;
    if (role == PriceRole) return product.price;
    if (role == UrlRole) return product.url;

    return QVariant();
}

QVariant ProductSearchResultModel::headerData(int section, Qt::Orientation orientation, int role) const {
    if (orientation == Qt::Horizontal && role == Qt::DisplayRole) {
        switch (section) {
            case 0: return tr("品番");
            case 1: return tr("标题");
            case 2: return tr("价格");
            case 3: return tr("链接");
            default: return QVariant();
        }
    }
    return QVariant();
}

QHash<int, QByteArray> ProductSearchResultModel::roleNames() const {
    QHash<int, QByteArray> roles;
    roles[CodeRole] = "code";
    roles[TitleRole] = "title";
    roles[PriceRole] = "price";
    roles[UrlRole] = "url";
    return roles;
}

void ProductSearchResultModel::clear() {
    beginResetModel();
    m_products.clear();
    endResetModel();
}

void ProductSearchResultModel::addResult(const QString &code, const QString &title, int price, const QString &url) {
    beginInsertRows(QModelIndex(), m_products.size(), m_products.size());
    m_products.append({code, title, price, url});
    endInsertRows();
}
