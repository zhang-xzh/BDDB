#include "viewmodel/torrentlistmodel.h"

TorrentListModel::TorrentListModel(QObject *parent)
    : QAbstractTableModel(parent) {
}

int TorrentListModel::rowCount(const QModelIndex &parent) const {
    if (parent.isValid()) return 0;
    return static_cast<int>(m_torrents.size());
}

int TorrentListModel::columnCount(const QModelIndex &parent) const {
    if (parent.isValid()) return 0;
    return 4; // name, hash, savePath, tags
}

QVariant TorrentListModel::data(const QModelIndex &index, int role) const {
    if (!index.isValid() || index.row() >= static_cast<int>(m_torrents.size()))
        return QVariant();

    const auto &torrent = m_torrents.at(index.row());

    if (role == Qt::DisplayRole || role == Qt::EditRole) {
        switch (index.column()) {
            case 0: return QString::fromStdString(torrent.name);
            case 1: return QString::fromStdString(torrent.hash);
            case 2: return QString::fromStdString(torrent.savePath);
            case 3: return QString::fromStdString(torrent.tags);
            default: return QVariant();
        }
    }

    // Role-based access
    if (role == NameRole) return QString::fromStdString(torrent.name);
    if (role == HashRole) return QString::fromStdString(torrent.hash);
    if (role == SavePathRole) return QString::fromStdString(torrent.savePath);
    if (role == TagsRole) return QString::fromStdString(torrent.tags);

    return QVariant();
}

QVariant TorrentListModel::headerData(int section, Qt::Orientation orientation, int role) const {
    if (orientation == Qt::Horizontal && role == Qt::DisplayRole) {
        switch (section) {
            case 0: return tr("名称");
            case 1: return tr("Hash");
            case 2: return tr("保存路径");
            case 3: return tr("标签");
            default: return QVariant();
        }
    }
    return QVariant();
}

QHash<int, QByteArray> TorrentListModel::roleNames() const {
    QHash<int, QByteArray> roles;
    roles[NameRole] = "name";
    roles[HashRole] = "hash";
    roles[SavePathRole] = "savePath";
    roles[TagsRole] = "tags";
    return roles;
}

void TorrentListModel::setTorrents(std::vector<Torrent> torrents) {
    beginResetModel();
    m_torrents = std::move(torrents);
    endResetModel();
}

void TorrentListModel::clear() {
    beginResetModel();
    m_torrents.clear();
    endResetModel();
}
