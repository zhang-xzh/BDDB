#ifndef PRODUCTSEARCHVIEWMODEL_H
#define PRODUCTSEARCHVIEWMODEL_H

#include <QObject>
#include <QPointer>
#include <QQmlApplicationEngine>
#include <QAbstractListModel>

class ProductSearchResultModel;

class ProductSearchViewModel : public QObject {
    Q_OBJECT
    Q_PROPERTY(QAbstractItemModel* searchResultModel READ searchResultModel CONSTANT)

public:
    explicit ProductSearchViewModel(QObject *parent = nullptr);
    ~ProductSearchViewModel() override;

    QAbstractItemModel* searchResultModel() const;

    Q_INVOKABLE void show();
    Q_INVOKABLE void search(const QString &query);
    Q_INVOKABLE void selectCurrent();

private:
    QPointer<ProductSearchResultModel> m_model;
    QObject *m_window = nullptr;
    QQmlApplicationEngine *m_engine = nullptr;
};

#endif // PRODUCTSEARCHVIEWMODEL_H
