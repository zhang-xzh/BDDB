#include "viewmodel/torrentmanagerviewmodel.h"
#include "viewmodel/torrentlistmodel.h"
#include "db/bddbrepository.h"

#include <QtConcurrent>
#include <QFutureWatcher>
#include <QQmlComponent>
#include <QQmlContext>
#include <QDebug>

TorrentManagerViewModel::TorrentManagerViewModel(QObject *parent)
    : QObject(parent)
    , m_model(new TorrentListModel(this))
    , m_engine(new QQmlApplicationEngine(this)) {
}

TorrentManagerViewModel::~TorrentManagerViewModel() {
    if (m_window) {
        delete m_window;
    }
}

QAbstractItemModel* TorrentManagerViewModel::torrentModel() const {
    return m_model.get();
}

void TorrentManagerViewModel::show() {
    if (!m_window) {
        // 注册类型并创建 QML 窗口
        m_engine->rootContext()->setContextProperty("viewModel", this);
        m_engine->rootContext()->setContextProperty("torrentViewModel", this);

        QQmlComponent component(m_engine, QUrl(QStringLiteral("qrc:/qt/qml/BDDB/qml/TorrentManagerWindow.qml")));
        if (component.status() != QQmlComponent::Ready) {
            qWarning() << "Failed to load TorrentManagerWindow.qml:" << component.errorString();
            return;
        }

        m_window = component.create();
        if (!m_window) {
            qWarning() << "Failed to create window:" << component.errorString();
            return;
        }

        // 窗口关闭时清理
        connect(m_window, SIGNAL(destroyed()), this, SLOT(deleteLater()));
    }

    // 显示窗口
    QMetaObject::invokeMethod(m_window, "show");
    QMetaObject::invokeMethod(m_window, "raise");
    QMetaObject::invokeMethod(m_window, "requestActivate");

    // 延迟加载数据
    loadData();
}

void TorrentManagerViewModel::loadData() {
    auto *watcher = new QFutureWatcher<DbResult<std::vector<Torrent>>>(this);
    connect(watcher, &QFutureWatcher<DbResult<std::vector<Torrent>>>::finished, this, [this, watcher] {
        if (auto result = watcher->result()) {
            m_model->setTorrents(std::move(*result));
        }
        watcher->deleteLater();
    });

    const auto future = QtConcurrent::run([]() -> DbResult<std::vector<Torrent>> {
        return BddbRepository::loadTorrents(false);
    });
    watcher->setFuture(future);
}

void TorrentManagerViewModel::setSearchText(const QString &text) {
    m_searchText = text;
    // TODO: 实现搜索过滤
}
