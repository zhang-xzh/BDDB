#ifndef VOLUMEMODEL_H
#define VOLUMEMODEL_H

#include <QAbstractTableModel>
#include <QList>
#include "models/models.h"

class VolumeModel : public QAbstractTableModel {
    Q_OBJECT

public:
    explicit VolumeModel(QObject *parent = nullptr);

    qint32 rowCount(const QModelIndex &parent = QModelIndex()) const override;
    qint32 columnCount(const QModelIndex &parent = QModelIndex()) const override;
    QVariant data(const QModelIndex &index, qint32 role = Qt::DisplayRole) const override;
    QVariant headerData(qint32 section, Qt::Orientation orientation, qint32 role = Qt::DisplayRole) const override;

    void setVolumes(QList<Volume> volumes);
    void clear();
    const Volume* volumeAt(qint32 row) const;

private:
    QList<Volume> m_volumes;
};

#endif // VOLUMEMODEL_H
