#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include "api/qbittorrentclient.h"
#include "db/bddbrepository.h"
#include "search/bangumisync.h"
#include "search/productsync.h"
#include <QMainWindow>
#include <QPointer>
#include <QMetaType>

// 注册自定义类型为元类型
Q_DECLARE_METATYPE(TorrentSyncResult)
Q_DECLARE_METATYPE(BddbRepository::LinkResult)
Q_DECLARE_METATYPE(SearchResult<BangumiSyncResult>)
Q_DECLARE_METATYPE(SearchResult<SyncResult>)

class QListWidget;
class QThread;

class TorrentManagerWindow;
class VolumeManagerWindow;
class VolumeEditorWindow;
class MediaEditorWindow;
class WorkLinkWindow;
class ProductSearchWindow;
class WorkSearchWindow;
class ProgressDialog;

// 同步 Worker 类 - 在有事件循环的线程中执行
class SyncWorker : public QObject {
    Q_OBJECT
public:
    explicit SyncWorker(QObject *parent = nullptr) : QObject(parent) {}

signals:
    void progressUpdated(int current, int total, QString message);
    void finished(const TorrentSyncResult &result);

public slots:
    void doWork() {
        QBittorrentClient client;
        auto result = client.syncTorrents([this](int current, int total, const std::string &message) {
            emit progressUpdated(current, total, QString::fromStdString(message));
        });
        emit finished(result);
    }
};

// 关联 Worker 类
class LinkWorker : public QObject {
    Q_OBJECT
public:
    explicit LinkWorker(QObject *parent = nullptr) : QObject(parent) {}

signals:
    void progressUpdated(int current, int total, QString message);
    void finished(const BddbRepository::LinkResult &result);

public slots:
    void doWork() {
        auto result = BddbRepository::linkVolumesToProducts(
            [this](int current, int total, const std::string &message) {
                emit progressUpdated(current, total, QString::fromStdString(message));
            }
        ).value_or(BddbRepository::LinkResult{});
        emit finished(result);
    }
};

// Bangumi 重建 Worker 类
class BangumiRebuildWorker : public QObject {
    Q_OBJECT
public:
    explicit BangumiRebuildWorker(QObject *parent = nullptr) : QObject(parent) {}

signals:
    void progressUpdated(int current, int total, QString message);
    void finished(const SearchResult<BangumiSyncResult> &result);

public slots:
    void doWork() {
        auto result = BangumiSyncService::rebuildIndex(
            [this](int processed, int total) {
                emit progressUpdated(processed, total, QString("Processing %1/%2").arg(processed).arg(total));
            }
        );
        emit finished(result);
    }
};

// Suruga-ya 重建 Worker 类
class SurugaRebuildWorker : public QObject {
    Q_OBJECT
public:
    explicit SurugaRebuildWorker(QObject *parent = nullptr) : QObject(parent) {}

signals:
    void progressUpdated(int current, int total, QString message);
    void finished(const SearchResult<SyncResult> &result);

public slots:
    void doWork() {
        auto result = ProductSyncService::rebuildIndex(
            [this](int processed, int total) {
                emit progressUpdated(processed, total, QString("Processing %1/%2").arg(processed).arg(total));
            }
        );
        emit finished(result);
    }
};

class MainWindow : public QMainWindow {
    Q_OBJECT

public:
    explicit MainWindow(QWidget *parent = nullptr);
    ~MainWindow() override;

private:
    void setupUI();

    void showTorrentManager();
    void showVolumeManager();
    void showProductSearch();
    void showWorkSearch();

    void showSyncDialog();
    void showLinkDialog();
    void showRebuildBangumiDialog();
    void showRebuildSurugaDialog();

    void appendLog(const QString& message);

    QPointer<TorrentManagerWindow> m_torrentManagerWindow;
    QPointer<VolumeManagerWindow> m_volumeManagerWindow;
    QPointer<VolumeEditorWindow> m_volumeEditorWindow;
    QPointer<MediaEditorWindow> m_mediaEditorWindow;
    QPointer<WorkLinkWindow> m_workLinkWindow;
    QPointer<ProductSearchWindow> m_productSearchWindow;
    QPointer<WorkSearchWindow> m_workSearchWindow;

    // 独立的进度对话框
    QPointer<ProgressDialog> m_syncDialog;
    QPointer<ProgressDialog> m_linkDialog;
    QPointer<ProgressDialog> m_rebuildBangumiDialog;
    QPointer<ProgressDialog> m_rebuildSurugaDialog;

    // 日志显示区域
    QListWidget* m_logList = nullptr;
};

#endif // MAINWINDOW_H
