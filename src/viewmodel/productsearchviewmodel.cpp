#include "viewmodel/productsearchviewmodel.h"
#include "viewmodel/productsearchresultmodel.h"

#include <QQmlComponent>
#include <QQmlContext>
#include <QDebug>

ProductSearchViewModel::ProductSearchViewModel(QObject *parent)
    : QObject(parent)
    , m_model(new ProductSearchResultModel(this))
    , m_engine(new QQmlApplicationEngine(this)) {
}

ProductSearchViewModel::~ProductSearchViewModel() {
    if (m_window) {
        delete m_window;
    }
}

QAbstractItemModel* ProductSearchViewModel::searchResultModel() const {
    return m_model.get();
}

void ProductSearchViewModel::show() {
    if (!m_window) {
        m_engine->rootContext()->setContextProperty("viewModel", this);
        m_engine->rootContext()->setContextProperty("productSearchViewModel", this);

        QQmlComponent component(m_engine, QUrl(QStringLiteral("qrc:/qt/qml/BDDB/qml/ProductSearchWindow.qml")));
        if (component.status() != QQmlComponent::Ready) {
            qWarning() << "Failed to load ProductSearchWindow.qml:" << component.errorString();
            return;
        }

        m_window = component.create();
        if (!m_window) {
            qWarning() << "Failed to create window:" << component.errorString();
            return;
        }

        connect(m_window, SIGNAL(destroyed()), this, SLOT(deleteLater()));
    }

    QMetaObject::invokeMethod(m_window, "show");
    QMetaObject::invokeMethod(m_window, "raise");
    QMetaObject::invokeMethod(m_window, "requestActivate");
}

void ProductSearchViewModel::search(const QString &query) {
    Q_UNUSED(query)
    // TODO: 实现搜索逻辑
    m_model->clear();
    // 临时添加一些测试数据
    m_model->addResult("TEST-001", "测试产品 1", 1000, "http://example.com/1");
    m_model->addResult("TEST-002", "测试产品 2", 2000, "http://example.com/2");
}

void ProductSearchViewModel::selectCurrent() {
    // TODO: 实现选择逻辑
}
