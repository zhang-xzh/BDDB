#include "torrentmodel.h"

TorrentModel::TorrentModel(QObject *parent)
    : QAbstractTableModel(parent) {
}

qint32 TorrentModel::rowCount(const QModelIndex &parent) const {
    return parent.isValid() ? 0 : static_cast<qint32>(m_torrents.size());
}

qint32 TorrentModel::columnCount(const QModelIndex &parent) const {
    return parent.isValid() ? 0 : 1; // 状态, 种子名
}

QVariant TorrentModel::data(const QModelIndex &index, qint32 role) const {
    if (!index.isValid() || index.row() >= static_cast<qint32>(m_torrents.size()))
        return QVariant();

    const auto &torrent = m_torrents.at(index.row());

    if (role == Qt::DisplayRole) {
        switch (index.column()) {
            case 0: return torrent.name;
            default: return QVariant();
        }
    }

    return QVariant();
}

QVariant TorrentModel::headerData(qint32 section, Qt::Orientation orientation, qint32 role) const {
    if (role != Qt::DisplayRole || orientation != Qt::Horizontal)
        return QVariant();

    switch (section) {
        case 0: return QStringLiteral("种子名");
        default: return QVariant();
    }
}

void TorrentModel::setTorrents(QList<Torrent> torrents) {
    beginResetModel();
    m_torrents = std::move(torrents);
    endResetModel();
}

void TorrentModel::clear() {
    beginResetModel();
    m_torrents.clear();
    endResetModel();
}

const Torrent *TorrentModel::torrentAt(qint32 row) const {
    if (row < 0 || row >= static_cast<qint32>(m_torrents.size()))
        return nullptr;
    return &m_torrents.at(row);
}
