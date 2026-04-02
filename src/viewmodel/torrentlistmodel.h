#ifndef TORRENTLISTMODEL_H
#define TORRENTLISTMODEL_H

#include <QAbstractTableModel>
#include <vector>
#include "models/models.h"

class TorrentListModel : public QAbstractTableModel {
    Q_OBJECT

public:
    enum Roles {
        NameRole = Qt::UserRole + 1,
        HashRole,
        SavePathRole,
        TagsRole
    };
    Q_ENUM(Roles)

    explicit TorrentListModel(QObject *parent = nullptr);

    // QAbstractTableModel 接口
    int rowCount(const QModelIndex &parent = QModelIndex()) const override;
    int columnCount(const QModelIndex &parent = QModelIndex()) const override;
    QVariant data(const QModelIndex &index, int role = Qt::DisplayRole) const override;
    QVariant headerData(int section, Qt::Orientation orientation, int role = Qt::DisplayRole) const override;
    QHash<int, QByteArray> roleNames() const override;

    // 数据操作
    void setTorrents(std::vector<Torrent> torrents);
    void clear();

private:
    std::vector<Torrent> m_torrents;
};

#endif // TORRENTLISTMODEL_H
