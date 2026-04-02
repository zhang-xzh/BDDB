#include "viewmodel/worksearchviewmodel.h"
#include "viewmodel/worksearchresultmodel.h"

#include <QQmlComponent>
#include <QQmlContext>
#include <QDebug>

WorkSearchViewModel::WorkSearchViewModel(QObject *parent)
    : QObject(parent)
    , m_model(new WorkSearchResultModel(this))
    , m_engine(new QQmlApplicationEngine(this)) {
}

WorkSearchViewModel::~WorkSearchViewModel() {
    if (m_window) {
        delete m_window;
    }
}

QAbstractItemModel* WorkSearchViewModel::searchResultModel() const {
    return m_model.get();
}

void WorkSearchViewModel::show() {
    if (!m_window) {
        m_engine->rootContext()->setContextProperty("viewModel", this);
        m_engine->rootContext()->setContextProperty("workSearchViewModel", this);

        QQmlComponent component(m_engine, QUrl(QStringLiteral("qrc:/qt/qml/BDDB/qml/WorkSearchWindow.qml")));
        if (component.status() != QQmlComponent::Ready) {
            qWarning() << "Failed to load WorkSearchWindow.qml:" << component.errorString();
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

void WorkSearchViewModel::search(const QString &query) {
    Q_UNUSED(query)
    // TODO: 实现搜索逻辑
    m_model->clear();
    // 临时添加一些测试数据
    m_model->addResult("测试作品 1", "Test Work 1", 2024, "动画");
    m_model->addResult("测试作品 2", "Test Work 2", 2023, "游戏");
}

void WorkSearchViewModel::selectCurrent() {
    // TODO: 实现选择逻辑
}
