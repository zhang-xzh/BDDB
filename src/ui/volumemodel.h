#ifndef VOLUMEMODEL_H
#define VOLUMEMODEL_H

#include <QAbstractTableModel>
#include <vector>
#include "models/models.h"

class VolumeModel : public QAbstractTableModel {
    Q_OBJECT

public:
    explicit VolumeModel(QObject *parent = nullptr);

    int rowCount(const QModelIndex &parent = QModelIndex()) const override;
    int columnCount(const QModelIndex &parent = QModelIndex()) const override;
    QVariant data(const QModelIndex &index, int role = Qt::DisplayRole) const override;
    QVariant headerData(int section, Qt::Orientation orientation, int role = Qt::DisplayRole) const override;

    void setVolumes(std::vector<Volume> volumes);
    void clear();
    const Volume* volumeAt(int row) const;

private:
    std::vector<Volume> m_volumes;
};

#endif // VOLUMEMODEL_H
