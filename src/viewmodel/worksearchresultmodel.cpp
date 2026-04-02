#include "viewmodel/worksearchresultmodel.h"

WorkSearchResultModel::WorkSearchResultModel(QObject *parent)
    : QAbstractTableModel(parent) {
}

int WorkSearchResultModel::rowCount(const QModelIndex &parent) const {
    if (parent.isValid()) return 0;
    return m_works.size();
}

int WorkSearchResultModel::columnCount(const QModelIndex &parent) const {
    if (parent.isValid()) return 0;
    return 4; // name, originalName, year, type
}

QVariant WorkSearchResultModel::data(const QModelIndex &index, int role) const {
    if (!index.isValid() || index.row() >= m_works.size())
        return QVariant();

    const auto &work = m_works.at(index.row());

    if (role == Qt::DisplayRole || role == Qt::EditRole) {
        switch (index.column()) {
            case 0: return work.name;
            case 1: return work.originalName;
            case 2: return work.year;
            case 3: return work.type;
            default: return QVariant();
        }
    }

    if (role == NameRole) return work.name;
    if (role == OriginalNameRole) return work.originalName;
    if (role == YearRole) return work.year;
    if (role == TypeRole) return work.type;

    return QVariant();
}

QVariant WorkSearchResultModel::headerData(int section, Qt::Orientation orientation, int role) const {
    if (orientation == Qt::Horizontal && role == Qt::DisplayRole) {
        switch (section) {
            case 0: return tr("作品名");
            case 1: return tr("原名");
            case 2: return tr("年份");
            case 3: return tr("类型");
            default: return QVariant();
        }
    }
    return QVariant();
}

QHash<int, QByteArray> WorkSearchResultModel::roleNames() const {
    QHash<int, QByteArray> roles;
    roles[NameRole] = "name";
    roles[OriginalNameRole] = "originalName";
    roles[YearRole] = "year";
    roles[TypeRole] = "type";
    return roles;
}

void WorkSearchResultModel::clear() {
    beginResetModel();
    m_works.clear();
    endResetModel();
}

void WorkSearchResultModel::addResult(const QString &name, const QString &originalName, int year, const QString &type) {
    beginInsertRows(QModelIndex(), m_works.size(), m_works.size());
    m_works.append({name, originalName, year, type});
    endInsertRows();
}
