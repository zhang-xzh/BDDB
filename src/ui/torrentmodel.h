#ifndef TORRENTMODEL_H
#define TORRENTMODEL_H

#include <QAbstractTableModel>
#include <vector>
#include "models/models.h"

class TorrentModel : public QAbstractTableModel {
    Q_OBJECT

public:
    explicit TorrentModel(QObject *parent = nullptr);

    // QAbstractTableModel 接口
    int rowCount(const QModelIndex &parent = QModelIndex()) const override;

    int columnCount(const QModelIndex &parent = QModelIndex()) const override;

    QVariant data(const QModelIndex &index, int role = Qt::DisplayRole) const override;

    QVariant headerData(int section, Qt::Orientation orientation, int role = Qt::DisplayRole) const override;

    // 数据操作
    void setTorrents(std::vector<Torrent> torrents);

    void clear();

    const Torrent *torrentAt(int row) const;

private:
    std::vector<Torrent> m_torrents;
};

#endif // TORRENTMODEL_H
