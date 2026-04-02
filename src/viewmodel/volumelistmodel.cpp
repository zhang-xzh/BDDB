#include "viewmodel/volumelistmodel.h"

VolumeListModel::VolumeListModel(QObject *parent)
    : QAbstractTableModel(parent) {
}

int VolumeListModel::rowCount(const QModelIndex &parent) const {
    if (parent.isValid()) return 0;
    return static_cast<int>(m_volumes.size());
}

int VolumeListModel::columnCount(const QModelIndex &parent) const {
    if (parent.isValid()) return 0;
    return 4; // id, catalogNo, volumeName, productIds
}

QVariant VolumeListModel::data(const QModelIndex &index, int role) const {
    if (!index.isValid() || index.row() >= static_cast<int>(m_volumes.size()))
        return QVariant();

    const auto &volume = m_volumes.at(index.row());

    if (role == Qt::DisplayRole || role == Qt::EditRole) {
        switch (index.column()) {
            case 0: return QString::fromStdString(volume.id);
            case 1: return QString::fromStdString(volume.catalogNo);
            case 2: return QString::fromStdString(volume.volumeName);
            case 3: {
                QStringList list;
                for (const auto &id : volume.productIds) {
                    list.append(QString::fromStdString(id));
                }
                return list.join(", ");
            }
            default: return QVariant();
        }
    }

    // Role-based access
    if (role == IdRole) return QString::fromStdString(volume.id);
    if (role == CatalogNoRole) return QString::fromStdString(volume.catalogNo);
    if (role == VolumeNameRole) return QString::fromStdString(volume.volumeName);
    if (role == ProductIdsRole) {
        QStringList list;
        for (const auto &id : volume.productIds) {
            list.append(QString::fromStdString(id));
        }
        return list;
    }

    return QVariant();
}

QVariant VolumeListModel::headerData(int section, Qt::Orientation orientation, int role) const {
    if (orientation == Qt::Horizontal && role == Qt::DisplayRole) {
        switch (section) {
            case 0: return tr("ID");
            case 1: return tr("型番");
            case 2: return tr("名称");
            case 3: return tr("产品ID");
            default: return QVariant();
        }
    }
    return QVariant();
}

QHash<int, QByteArray> VolumeListModel::roleNames() const {
    QHash<int, QByteArray> roles;
    roles[IdRole] = "id";
    roles[CatalogNoRole] = "catalogNo";
    roles[VolumeNameRole] = "volumeName";
    roles[ProductIdsRole] = "productIds";
    return roles;
}

void VolumeListModel::setVolumes(std::vector<Volume> volumes) {
    beginResetModel();
    m_volumes = std::move(volumes);
    endResetModel();
}

void VolumeListModel::clear() {
    beginResetModel();
    m_volumes.clear();
    endResetModel();
}
