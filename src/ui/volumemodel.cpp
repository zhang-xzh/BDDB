#include "volumemodel.h"

VolumeModel::VolumeModel(QObject *parent)
    : QAbstractTableModel(parent) {
}

qint32 VolumeModel::rowCount(const QModelIndex &parent) const {
    return parent.isValid() ? 0 : static_cast<qint32>(m_volumes.size());
}

qint32 VolumeModel::columnCount(const QModelIndex &parent) const {
    return parent.isValid() ? 0 : 2; // 编号, 标题
}

QVariant VolumeModel::data(const QModelIndex &index, qint32 role) const {
    if (!index.isValid() || index.row() >= static_cast<qint32>(m_volumes.size()))
        return QVariant();

    const auto &volume = m_volumes.at(index.row());

    if (role == Qt::DisplayRole) {
        switch (index.column()) {
            case 0: return volume.catalogNo;
            case 1: return volume.volumeName;
            default: return QVariant();
        }
    }

    return QVariant();
}

QVariant VolumeModel::headerData(qint32 section, Qt::Orientation orientation, qint32 role) const {
    if (role != Qt::DisplayRole || orientation != Qt::Horizontal)
        return QVariant();

    switch (section) {
        case 0: return QStringLiteral("编号");
        case 1: return QStringLiteral("标题");
        default: return QVariant();
    }
}

void VolumeModel::setVolumes(QList<Volume> volumes) {
    beginResetModel();
    m_volumes = std::move(volumes);
    endResetModel();
}

void VolumeModel::clear() {
    beginResetModel();
    m_volumes.clear();
    endResetModel();
}

const Volume* VolumeModel::volumeAt(qint32 row) const {
    if (row < 0 || row >= static_cast<qint32>(m_volumes.size()))
        return nullptr;
    return &m_volumes.at(row);
}
