#ifndef VOLUMELISTMODEL_H
#define VOLUMELISTMODEL_H

#include <QAbstractTableModel>
#include <vector>
#include "models/models.h"

class VolumeListModel : public QAbstractTableModel {
    Q_OBJECT

public:
    enum Roles {
        IdRole = Qt::UserRole + 1,
        CatalogNoRole,
        VolumeNameRole,
        ProductIdsRole
    };
    Q_ENUM(Roles)

    explicit VolumeListModel(QObject *parent = nullptr);

    // QAbstractTableModel 接口
    int rowCount(const QModelIndex &parent = QModelIndex()) const override;
    int columnCount(const QModelIndex &parent = QModelIndex()) const override;
    QVariant data(const QModelIndex &index, int role = Qt::DisplayRole) const override;
    QVariant headerData(int section, Qt::Orientation orientation, int role = Qt::DisplayRole) const override;
    QHash<int, QByteArray> roleNames() const override;

    // 数据操作
    void setVolumes(std::vector<Volume> volumes);
    void clear();

private:
    std::vector<Volume> m_volumes;
};

#endif // VOLUMELISTMODEL_H
