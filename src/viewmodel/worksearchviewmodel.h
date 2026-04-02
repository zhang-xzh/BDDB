#ifndef WORKSEARCHVIEWMODEL_H
#define WORKSEARCHVIEWMODEL_H

#include <QObject>
#include <QPointer>
#include <QQmlApplicationEngine>
#include <QAbstractListModel>

class WorkSearchResultModel;

class WorkSearchViewModel : public QObject {
    Q_OBJECT
    Q_PROPERTY(QAbstractItemModel* searchResultModel READ searchResultModel CONSTANT)

public:
    explicit WorkSearchViewModel(QObject *parent = nullptr);
    ~WorkSearchViewModel() override;

    QAbstractItemModel* searchResultModel() const;

    Q_INVOKABLE void show();
    Q_INVOKABLE void search(const QString &query);
    Q_INVOKABLE void selectCurrent();

private:
    QPointer<WorkSearchResultModel> m_model;
    QObject *m_window = nullptr;
    QQmlApplicationEngine *m_engine = nullptr;
};

#endif // WORKSEARCHVIEWMODEL_H
