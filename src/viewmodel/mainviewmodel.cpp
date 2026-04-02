#include "mainviewmodel.h"
#include "viewmodel/torrentmanagerviewmodel.h"
#include "viewmodel/volumemanagerviewmodel.h"
#include "viewmodel/productsearchviewmodel.h"
#include "viewmodel/worksearchviewmodel.h"
#include "viewmodel/progressdialogviewmodel.h"

#include "api/qbittorrentclient.h"
#include "db/bddbrepository.h"
#include "search/bangumisync.h"
#include "search/productsync.h"

#include <QDateTime>
#include <QThread>
#include <QQmlApplicationEngine>
#include <QDebug>

// ═══════════════════════════════════════════════════════════════════════════════
// Worker 类 - 用于后台任务
// ═══════════════════════════════════════════════════════════════════════════════

class SyncWorker : public QObject {
    Q_OBJECT

public:
    explicit SyncWorker(QObject *parent = nullptr) : QObject(parent) {
    }

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

class LinkWorker : public QObject {
    Q_OBJECT

public:
    explicit LinkWorker(QObject *parent = nullptr) : QObject(parent) {
    }

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

class BangumiRebuildWorker : public QObject {
    Q_OBJECT

public:
    explicit BangumiRebuildWorker(QObject *parent = nullptr) : QObject(parent) {
    }

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

class SurugaRebuildWorker : public QObject {
    Q_OBJECT

public:
    explicit SurugaRebuildWorker(QObject *parent = nullptr) : QObject(parent) {
    }

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

// ═══════════════════════════════════════════════════════════════════════════════
// MainViewModel 实现
// ═══════════════════════════════════════════════════════════════════════════════

MainViewModel::MainViewModel(QObject *parent)
    : QObject(parent)
      , m_logModel(new QStringListModel(this)) {
}

MainViewModel::~MainViewModel() = default;

QStringListModel *MainViewModel::logModel() const {
    return m_logModel;
}

void MainViewModel::showTorrentManager() {
    if (!m_torrentManagerVM) {
        m_torrentManagerVM = new TorrentManagerViewModel(this);
    }
    m_torrentManagerVM->show();
}

void MainViewModel::showVolumeManager() {
    if (!m_volumeManagerVM) {
        m_volumeManagerVM = new VolumeManagerViewModel(this);
    }
    m_volumeManagerVM->show();
}

void MainViewModel::showProductSearch() {
    if (!m_productSearchVM) {
        m_productSearchVM = new ProductSearchViewModel(this);
    }
    m_productSearchVM->show();
}

void MainViewModel::showWorkSearch() {
    if (!m_workSearchVM) {
        m_workSearchVM = new WorkSearchViewModel(this);
    }
    m_workSearchVM->show();
}

void MainViewModel::showSyncDialog() {
    if (!m_syncDialogVM) {
        m_syncDialogVM = new ProgressDialogViewModel("同步", this);
    }
    m_syncDialogVM->setStatus("准备同步...");
    m_syncDialogVM->setProgress(0);
    m_syncDialogVM->show();

    auto *thread = new QThread(this);
    auto *worker = new SyncWorker();
    worker->moveToThread(thread);

    connect(thread, &QThread::started, worker, &SyncWorker::doWork);
    connect(worker, &SyncWorker::progressUpdated, this, [this](int current, int total, const QString &message) {
        if (m_syncDialogVM) {
            const int progress = total > 0 ? static_cast<int>((current * 100.0) / total) : 0;
            m_syncDialogVM->setProgress(progress);
            m_syncDialogVM->setStatus(message);
        }
        appendLog(QString("%1/%2: %3").arg(current).arg(total).arg(message));
    });
    connect(worker, &SyncWorker::finished, this, [this, thread, worker](const TorrentSyncResult &result) {
        if (m_syncDialogVM) {
            if (result.success) {
                m_syncDialogVM->setStatus(
                    QStringLiteral("同步完成: 新增 %1, 更新 %2, 总计 %3")
                    .arg(result.newCount)
                    .arg(result.updateCount)
                    .arg(result.total));
            } else {
                m_syncDialogVM->setStatus(
                    QStringLiteral("同步失败: %1")
                    .arg(QString::fromStdString(result.error)));
            }
            m_syncDialogVM->setProgress(100);
        }
        thread->quit();
        thread->wait();
        thread->deleteLater();
        worker->deleteLater();
    });

    thread->start();
}

void MainViewModel::showLinkDialog() {
    if (!m_linkDialogVM) {
        m_linkDialogVM = new ProgressDialogViewModel("关联", this);
    }
    m_linkDialogVM->setStatus("准备关联产品...");
    m_linkDialogVM->setProgress(0);
    m_linkDialogVM->show();

    auto *thread = new QThread(this);
    auto *worker = new LinkWorker();
    worker->moveToThread(thread);

    connect(thread, &QThread::started, worker, &LinkWorker::doWork);
    connect(worker, &LinkWorker::progressUpdated, this, [this](int current, int total, const QString &message) {
        if (m_linkDialogVM) {
            const int progress = total > 0 ? static_cast<int>((current * 100.0) / total) : 0;
            m_linkDialogVM->setProgress(progress);
            m_linkDialogVM->setStatus(message);
        }
        appendLog(QString("%1/%2: %3").arg(current).arg(total).arg(message));
    });
    connect(worker, &LinkWorker::finished, this, [this, thread, worker](const BddbRepository::LinkResult &result) {
        if (m_linkDialogVM) {
            m_linkDialogVM->setStatus(
                QStringLiteral("关联完成: 更新 %1, 匹配 %2, 跳过 %3")
                .arg(result.updated)
                .arg(result.matched)
                .arg(result.skipped));
            m_linkDialogVM->setProgress(100);
        }
        thread->quit();
        thread->wait();
        thread->deleteLater();
        worker->deleteLater();
    });

    thread->start();
}

void MainViewModel::showRebuildBangumiDialog() {
    if (!m_rebuildBangumiVM) {
        m_rebuildBangumiVM = new ProgressDialogViewModel("重建 Bangumi 索引", this);
    }
    m_rebuildBangumiVM->setStatus("准备重建 Bangumi 索引...");
    m_rebuildBangumiVM->setProgress(0);
    m_rebuildBangumiVM->show();

    auto *thread = new QThread(this);
    auto *worker = new BangumiRebuildWorker();
    worker->moveToThread(thread);

    connect(thread, &QThread::started, worker, &BangumiRebuildWorker::doWork);
    connect(worker, &BangumiRebuildWorker::progressUpdated, this, [this](int current, int total, const QString &message) {
        if (m_rebuildBangumiVM) {
            const int progress = total > 0 ? static_cast<int>((current * 100.0) / total) : 0;
            m_rebuildBangumiVM->setProgress(progress);
            m_rebuildBangumiVM->setStatus(message);
        }
        appendLog(QString("%1/%2: %3").arg(current).arg(total).arg(message));
    });
    connect(worker, &BangumiRebuildWorker::finished, this, [this, thread, worker](const SearchResult<BangumiSyncResult> &result) {
        if (m_rebuildBangumiVM) {
            if (result) {
                m_rebuildBangumiVM->setStatus(
                    QStringLiteral("重建完成: 总计 %1, 索引 %2, 失败 %3")
                    .arg(result->total)
                    .arg(result->indexed)
                    .arg(result->failed));
            } else {
                m_rebuildBangumiVM->setStatus(
                    QStringLiteral("重建失败: %1")
                    .arg(QString::fromStdString(result.error())));
            }
            m_rebuildBangumiVM->setProgress(100);
        }
        thread->quit();
        thread->wait();
        thread->deleteLater();
        worker->deleteLater();
    });

    thread->start();
}

void MainViewModel::showRebuildSurugaDialog() {
    if (!m_rebuildSurugaVM) {
        m_rebuildSurugaVM = new ProgressDialogViewModel("重建 suruga-ya 索引", this);
    }
    m_rebuildSurugaVM->setStatus("准备重建 suruga-ya 索引...");
    m_rebuildSurugaVM->setProgress(0);
    m_rebuildSurugaVM->show();

    auto *thread = new QThread(this);
    auto *worker = new SurugaRebuildWorker();
    worker->moveToThread(thread);

    connect(thread, &QThread::started, worker, &SurugaRebuildWorker::doWork);
    connect(worker, &SurugaRebuildWorker::progressUpdated, this, [this](int current, int total, const QString &message) {
        if (m_rebuildSurugaVM) {
            const int progress = total > 0 ? static_cast<int>((current * 100.0) / total) : 0;
            m_rebuildSurugaVM->setProgress(progress);
            m_rebuildSurugaVM->setStatus(message);
        }
        appendLog(QString("%1/%2: %3").arg(current).arg(total).arg(message));
    });
    connect(worker, &SurugaRebuildWorker::finished, this, [this, thread, worker](const SearchResult<SyncResult> &result) {
        if (m_rebuildSurugaVM) {
            if (result) {
                m_rebuildSurugaVM->setStatus(
                    QStringLiteral("重建完成: 总计 %1, 索引 %2, 失败 %3")
                    .arg(result->total)
                    .arg(result->indexed)
                    .arg(result->failed));
            } else {
                m_rebuildSurugaVM->setStatus(
                    QStringLiteral("重建失败: %1")
                    .arg(QString::fromStdString(result.error())));
            }
            m_rebuildSurugaVM->setProgress(100);
        }
        thread->quit();
        thread->wait();
        thread->deleteLater();
        worker->deleteLater();
    });

    thread->start();
}

void MainViewModel::appendLog(const QString &message) {
    if (m_logModel) {
        const QString timestamp = QDateTime::currentDateTime().toString("HH:mm:ss");
        const QString logEntry = QString("[%1] %2").arg(timestamp, message);

        QStringList logs = m_logModel->stringList();
        logs.append(logEntry);

        // 限制最大行数
        while (logs.size() > 1000) {
            logs.removeFirst();
        }

        m_logModel->setStringList(logs);
    }
}

#include "mainviewmodel.moc"
