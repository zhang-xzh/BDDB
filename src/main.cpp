#include <QApplication>
#include <QFontDatabase>
#include <QDebug>
#include "core/mainwindow.h"
#include "db/connection.h"
#include "search/meilisearchclient.h"
#include "api/qbittorrentclient.h"
#include "db/bddbrepository.h"
#include "search/bangumisync.h"
#include "search/productsync.h"

int main(int argc, char *argv[]) {
    // Windows 高 DPI 支持 - 必须在 QApplication 之前设置
#ifdef Q_OS_WIN
    qputenv("QT_SCALE_FACTOR_ROUNDING_POLICY", "PassThrough");
#endif

    QApplication app(argc, argv);

    QApplication::setApplicationName("BDDB");
    QApplication::setOrganizationName("BDDB");

    // 注册元类型以便跨线程信号使用
    qRegisterMetaType<TorrentSyncResult>();
    qRegisterMetaType<BddbRepository::LinkResult>();
    qRegisterMetaType<SearchResult<BangumiSyncResult> >();
    qRegisterMetaType<SearchResult<SyncResult> >();

    // 全局抗锯齿字体 - 使用系统默认字体但强制抗锯齿
    QFont font = QFontDatabase::systemFont(QFontDatabase::GeneralFont);
    font.setStyleStrategy(QFont::PreferAntialias);
    QApplication::setFont(font);

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

    MainWindow window;
    window.show();

    return QApplication::exec();
}
