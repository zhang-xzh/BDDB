#include "models/torrentmodel.h"

TorrentModel::TorrentModel(QObject *parent)
    : QAbstractTableModel(parent) {
}

int TorrentModel::rowCount(const QModelIndex &parent) const {
    return parent.isValid() ? 0 : static_cast<int>(m_torrents.size());
}

int TorrentModel::columnCount(const QModelIndex &parent) const {
    return parent.isValid() ? 0 : 2; // 状态, 种子名
}

QVariant TorrentModel::data(const QModelIndex &index, int role) const {
    if (!index.isValid() || index.row() >= static_cast<int>(m_torrents.size()))
        return QVariant();

    const auto &torrent = m_torrents.at(index.row());

    if (role == Qt::DisplayRole) {
        switch (index.column()) {
            case 0: return QString::fromStdString(torrent.state);
            case 1: return QString::fromStdString(torrent.name);
            default: return QVariant();
        }
    }

    return QVariant();
}

QVariant TorrentModel::headerData(int section, Qt::Orientation orientation, int role) const {
    if (role != Qt::DisplayRole || orientation != Qt::Horizontal)
        return QVariant();

    switch (section) {
        case 0: return QStringLiteral("状态");
        case 1: return QStringLiteral("种子名");
        default: return QVariant();
    }
}

void TorrentModel::setTorrents(std::vector<Torrent> torrents) {
    beginResetModel();
    m_torrents = std::move(torrents);
    endResetModel();
}

void TorrentModel::clear() {
    beginResetModel();
    m_torrents.clear();
    endResetModel();
}

const Torrent* TorrentModel::torrentAt(int row) const {
    if (row < 0 || row >= static_cast<int>(m_torrents.size()))
        return nullptr;
    return &m_torrents.at(row);
}
