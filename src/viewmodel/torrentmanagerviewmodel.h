#ifndef TORRENTMANAGERVIEWMODEL_H
#define TORRENTMANAGERVIEWMODEL_H

#include <QObject>
#include <QPointer>
#include <QQmlApplicationEngine>
#include <QAbstractListModel>

class TorrentListModel;

class TorrentManagerViewModel : public QObject {
    Q_OBJECT
    Q_PROPERTY(QAbstractItemModel* torrentModel READ torrentModel CONSTANT)

public:
    explicit TorrentManagerViewModel(QObject *parent = nullptr);
    ~TorrentManagerViewModel() override;

    QAbstractItemModel* torrentModel() const;

    Q_INVOKABLE void show();
    Q_INVOKABLE void loadData();
    Q_INVOKABLE void setSearchText(const QString &text);

private:
    QPointer<TorrentListModel> m_model;
    QObject *m_window = nullptr;
    QQmlApplicationEngine *m_engine = nullptr;
    QString m_searchText;
};

#endif // TORRENTMANAGERVIEWMODEL_H
