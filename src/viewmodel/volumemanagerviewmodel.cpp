#include "viewmodel/volumemanagerviewmodel.h"
#include "viewmodel/volumelistmodel.h"
#include "db/bddbrepository.h"

#include <QtConcurrent>
#include <QFutureWatcher>
#include <QQmlComponent>
#include <QQmlContext>
#include <QDebug>

VolumeManagerViewModel::VolumeManagerViewModel(QObject *parent)
    : QObject(parent)
    , m_model(new VolumeListModel(this))
    , m_engine(new QQmlApplicationEngine(this)) {
}

VolumeManagerViewModel::~VolumeManagerViewModel() {
    if (m_window) {
        delete m_window;
    }
}

QAbstractItemModel* VolumeManagerViewModel::volumeModel() const {
    return m_model.get();
}

void VolumeManagerViewModel::show() {
    if (!m_window) {
        m_engine->rootContext()->setContextProperty("viewModel", this);
        m_engine->rootContext()->setContextProperty("volumeViewModel", this);

        QQmlComponent component(m_engine, QUrl(QStringLiteral("qrc:/qt/qml/BDDB/qml/VolumeManagerWindow.qml")));
        if (component.status() != QQmlComponent::Ready) {
            qWarning() << "Failed to load VolumeManagerWindow.qml:" << component.errorString();
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

    loadData();
}

void VolumeManagerViewModel::loadData() {
    auto *watcher = new QFutureWatcher<DbResult<std::vector<Volume>>>(this);
    connect(watcher, &QFutureWatcher<DbResult<std::vector<Volume>>>::finished, this, [this, watcher] {
        auto result = watcher->result();
        if (result) {
            m_model->setVolumes(std::move(*result));
        }
        watcher->deleteLater();
    });

    auto future = QtConcurrent::run([]() -> DbResult<std::vector<Volume>> {
        return BddbRepository::getAllVolumes();
    });
    watcher->setFuture(future);
}

void VolumeManagerViewModel::setCodeFilter(const QString &text) {
    m_codeFilter = text;
    // TODO: 实现过滤
}

void VolumeManagerViewModel::setTitleFilter(const QString &text) {
    m_titleFilter = text;
    // TODO: 实现过滤
}
