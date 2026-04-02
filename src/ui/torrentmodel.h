#ifndef TORRENTMODEL_H
#define TORRENTMODEL_H

#include <QAbstractTableModel>
#include <QList>
#include "models/models.h"

class TorrentModel : public QAbstractTableModel {
    Q_OBJECT

public:
    explicit TorrentModel(QObject *parent = nullptr);

    // QAbstractTableModel 接口
    qint32 rowCount(const QModelIndex &parent = QModelIndex()) const override;

    qint32 columnCount(const QModelIndex &parent = QModelIndex()) const override;

    QVariant data(const QModelIndex &index, qint32 role = Qt::DisplayRole) const override;

    QVariant headerData(qint32 section, Qt::Orientation orientation, qint32 role = Qt::DisplayRole) const override;

    // 数据操作
    void setTorrents(QList<Torrent> torrents);

    void clear();

    const Torrent *torrentAt(qint32 row) const;

private:
    QList<Torrent> m_torrents;
};

#endif // TORRENTMODEL_H
