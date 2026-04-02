#include <QGuiApplication>
#include <QQmlApplicationEngine>
#include <QQmlContext>
#include <QQuickStyle>
#include <QFontDatabase>
#include <QDebug>
#include <QFile>
#include <QTextStream>

#include "viewmodel/mainviewmodel.h"
#include "db/connection.h"
#include "search/meilisearchclient.h"
#include "api/qbittorrentclient.h"
#include "db/bddbrepository.h"
#include "search/bangumisync.h"
#include "search/productsync.h"

int main(int argc, char *argv[]) {
    // Windows 高 DPI 支持 - 必须在 QGuiApplication 之前设置
#ifdef Q_OS_WIN
    qputenv("QT_SCALE_FACTOR_ROUNDING_POLICY", "PassThrough");
#endif

    QGuiApplication app(argc, argv);

    QGuiApplication::setApplicationName("BDDB");
    QGuiApplication::setOrganizationName("BDDB");

    // 设置 Fusion 样式 - 使用默认样式，不自定义
    QQuickStyle::setStyle("Fusion");

    // 注册元类型以便跨线程信号使用
    qRegisterMetaType<TorrentSyncResult>();
    qRegisterMetaType<BddbRepository::LinkResult>();
    qRegisterMetaType<SearchResult<BangumiSyncResult>>();
    qRegisterMetaType<SearchResult<SyncResult>>();

    // 全局抗锯齿字体 - 使用系统默认字体但强制抗锯齿
    QFont font = QFontDatabase::systemFont(QFontDatabase::GeneralFont);
    font.setStyleStrategy(QFont::PreferAntialias);
    QGuiApplication::setFont(font);

    // 初始化 MongoDB 连接
    if (!MongoConnection::instance().connect("mongodb://localhost:27017")) {
        qWarning() << "Failed to connect to MongoDB";
    } else {
        qDebug() << "MongoDB connected successfully";
    }

    // 初始化 Meilisearch 连接
    if (!MeiliSearchClient::instance().connect()) {
        qWarning() << "Failed to connect to Meilisearch";
    } else {
        qDebug() << "Meilisearch connected successfully";
    }

    // 创建 ViewModel
    auto *mainViewModel = new MainViewModel(&app);

    // 创建 QML 引擎
    QQmlApplicationEngine engine;

    // 注册 QML 模块
    qmlRegisterSingletonInstance("BDDB", 1, 0, "MainViewModel", mainViewModel);

    // 设置上下文属性
    engine.rootContext()->setContextProperty("mainViewModel", mainViewModel);

    auto logError = [](const QString &msg) {
        QFile f("C:/Users/zhang/CODE/BDDB/qml_error.log");
        if (f.open(QIODevice::WriteOnly | QIODevice::Append | QIODevice::Text)) {
            QTextStream s(&f);
            s << msg << "\n";
        }
    };

    QObject::connect(&engine, &QQmlApplicationEngine::warnings,
                     &app, [&logError](const QList<QQmlError> &warnings) {
                         for (const auto &err : warnings) {
                             logError(err.toString());
                         }
                     });

    // 连接对象创建失败信号
    QObject::connect(&engine, &QQmlApplicationEngine::objectCreationFailed,
                     &app, [&logError]() {
                         logError("QML object creation failed");
                         QCoreApplication::exit(-1);
                     },
                     Qt::QueuedConnection);

    // 加载主窗口 QML
    engine.load(QUrl(QStringLiteral("qrc:/qt/qml/BDDB/qml/MainWindow.qml")));
    if (engine.rootObjects().isEmpty()) {
        logError("Root objects empty after load");
    }

    return QGuiApplication::exec();
}
