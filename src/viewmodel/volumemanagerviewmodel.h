#ifndef VOLUMEMANAGERVIEWMODEL_H
#define VOLUMEMANAGERVIEWMODEL_H

#include <QObject>
#include <QPointer>
#include <QQmlApplicationEngine>
#include <QAbstractListModel>

class VolumeListModel;

class VolumeManagerViewModel : public QObject {
    Q_OBJECT
    Q_PROPERTY(QAbstractItemModel* volumeModel READ volumeModel CONSTANT)

public:
    explicit VolumeManagerViewModel(QObject *parent = nullptr);
    ~VolumeManagerViewModel() override;

    QAbstractItemModel* volumeModel() const;

    Q_INVOKABLE void show();
    Q_INVOKABLE void loadData();
    Q_INVOKABLE void setCodeFilter(const QString &text);
    Q_INVOKABLE void setTitleFilter(const QString &text);

private:
    QPointer<VolumeListModel> m_model;
    QObject *m_window = nullptr;
    QQmlApplicationEngine *m_engine = nullptr;
    QString m_codeFilter;
    QString m_titleFilter;
};

#endif // VOLUMEMANAGERVIEWMODEL_H
