#ifndef WORKSEARCHRESULTMODEL_H
#define WORKSEARCHRESULTMODEL_H

#include <QAbstractTableModel>

class WorkSearchResultModel : public QAbstractTableModel {
    Q_OBJECT

public:
    enum Roles {
        NameRole = Qt::UserRole + 1,
        OriginalNameRole,
        YearRole,
        TypeRole
    };
    Q_ENUM(Roles)

    explicit WorkSearchResultModel(QObject *parent = nullptr);

    int rowCount(const QModelIndex &parent = QModelIndex()) const override;
    int columnCount(const QModelIndex &parent = QModelIndex()) const override;
    QVariant data(const QModelIndex &index, int role = Qt::DisplayRole) const override;
    QVariant headerData(int section, Qt::Orientation orientation, int role = Qt::DisplayRole) const override;
    QHash<int, QByteArray> roleNames() const override;

    void clear();
    void addResult(const QString &name, const QString &originalName, int year, const QString &type);

private:
    struct Work {
        QString name;
        QString originalName;
        int year = 0;
        QString type;
    };
    QList<Work> m_works;
};

#endif // WORKSEARCHRESULTMODEL_H
