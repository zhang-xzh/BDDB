#include "mainwindow.h"
#include "ui/torrentmanagerwindow.h"
#include "ui/volumemanagerwindow.h"
#include "ui/productsearchwindow.h"
#include "ui/worksearchwindow.h"
#include "ui/progressdialog.h"
#include "api/qbittorrentclient.h"
#include "db/bddbrepository.h"
#include "search/bangumisync.h"
#include "search/productsync.h"
#include <QApplication>
#include <QGroupBox>
#include <QPushButton>
#include <QHBoxLayout>
#include <QWidget>
#include <QListWidget>
#include <QDateTime>
#include <QThread>

MainWindow::MainWindow(QWidget *parent)
    : QMainWindow(parent) {
    setupUI();
    setWindowTitle("BDDB");
}

MainWindow::~MainWindow() = default;

void MainWindow::setupUI() {
    // 禁止窗口放大缩小
    setWindowFlags(windowFlags() & ~Qt::WindowMaximizeButtonHint);

    // 获取应用程序的抗锯齿字体
    QFont antialiasedFont = QApplication::font();
    antialiasedFont.setStyleStrategy(QFont::PreferAntialias);

    // 主内容区 - 垂直布局（按钮区域 + 日志区域）
    auto *centralWidget = new QWidget(this);
    centralWidget->setFont(antialiasedFont);
    auto *mainLayout = new QVBoxLayout(centralWidget);
    mainLayout->setSpacing(12);
    mainLayout->setContentsMargins(12, 8, 12, 8);
    setCentralWidget(centralWidget);

    // 按钮区域 - 水平排列各分组
    auto *buttonsWidget = new QWidget(this);
    buttonsWidget->setFont(antialiasedFont);
    auto *buttonsLayout = new QHBoxLayout(buttonsWidget);
    buttonsLayout->setSpacing(12);
    buttonsLayout->setContentsMargins(0, 0, 0, 0);

    // 管理分组 - 垂直按钮布局
    auto *groupManage = new QGroupBox("管理", this);
    groupManage->setFont(antialiasedFont);
    auto *layoutManage = new QVBoxLayout(groupManage);
    layoutManage->setSpacing(8);
    layoutManage->setContentsMargins(8, 12, 8, 8);

    auto *btnTorrent = new QPushButton("种子管理", this);
    btnTorrent->setFont(antialiasedFont);
    connect(btnTorrent, &QPushButton::clicked, this, &MainWindow::showTorrentManager);
    layoutManage->addWidget(btnTorrent);

    auto *btnVolume = new QPushButton("分卷管理", this);
    btnVolume->setFont(antialiasedFont);
    connect(btnVolume, &QPushButton::clicked, this, &MainWindow::showVolumeManager);
    layoutManage->addWidget(btnVolume);

    buttonsLayout->addWidget(groupManage);

    // 搜索分组 - 垂直按钮布局
    auto *groupSearch = new QGroupBox("搜索", this);
    groupSearch->setFont(antialiasedFont);
    auto *layoutSearch = new QVBoxLayout(groupSearch);
    layoutSearch->setSpacing(8);
    layoutSearch->setContentsMargins(8, 12, 8, 8);

    auto *btnProduct = new QPushButton("产品搜索", this);
    btnProduct->setFont(antialiasedFont);
    connect(btnProduct, &QPushButton::clicked, this, &MainWindow::showProductSearch);
    layoutSearch->addWidget(btnProduct);

    auto *btnWork = new QPushButton("作品搜索", this);
    btnWork->setFont(antialiasedFont);
    connect(btnWork, &QPushButton::clicked, this, &MainWindow::showWorkSearch);
    layoutSearch->addWidget(btnWork);

    buttonsLayout->addWidget(groupSearch);

    // 数据分组 - 垂直按钮布局
    auto *groupData = new QGroupBox("数据", this);
    groupData->setFont(antialiasedFont);
    auto *layoutData = new QVBoxLayout(groupData);
    layoutData->setSpacing(8);
    layoutData->setContentsMargins(8, 12, 8, 8);

    auto *btnSync = new QPushButton("同步种子", this);
    btnSync->setFont(antialiasedFont);
    connect(btnSync, &QPushButton::clicked, this, &MainWindow::showSyncDialog);
    layoutData->addWidget(btnSync);

    auto *btnLink = new QPushButton("关联产品", this);
    btnLink->setFont(antialiasedFont);
    connect(btnLink, &QPushButton::clicked, this, &MainWindow::showLinkDialog);
    layoutData->addWidget(btnLink);

    buttonsLayout->addWidget(groupData);
    buttonsLayout->addStretch();

    mainLayout->addWidget(buttonsWidget);

    // 日志显示区域
    auto *logGroup = new QGroupBox("日志", this);
    logGroup->setFont(antialiasedFont);
    auto *logLayout = new QVBoxLayout(logGroup);
    logLayout->setSpacing(4);
    logLayout->setContentsMargins(8, 12, 8, 8);

    m_logList = new QListWidget(this);
    m_logList->setFont(antialiasedFont);
    m_logList->setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
    logLayout->addWidget(m_logList);

    mainLayout->addWidget(logGroup, 1);

    // 自适应窗口大小
    setFixedSize(sizeHint());
}

void MainWindow::appendLog(const QString &message) {
    if (m_logList) {
        const QString timestamp = QDateTime::currentDateTime().toString("HH:mm:ss");
        auto *item = new QListWidgetItem(QString("[%1] %2").arg(timestamp, message));
        m_logList->addItem(item);
        m_logList->scrollToBottom();
        // 限制最大行数
        while (m_logList->count() > 1000) {
            delete m_logList->takeItem(0);
        }
    }
}

void MainWindow::showTorrentManager() {
    if (!m_torrentManagerWindow) {
        m_torrentManagerWindow = new TorrentManagerWindow();
        m_torrentManagerWindow->setWindowFlag(Qt::Window);
    }
    m_torrentManagerWindow->show();
    m_torrentManagerWindow->raise();
    m_torrentManagerWindow->activateWindow();
}

void MainWindow::showVolumeManager() {
    if (!m_volumeManagerWindow) {
        m_volumeManagerWindow = new VolumeManagerWindow();
        m_volumeManagerWindow->setWindowFlag(Qt::Window);
    }
    m_volumeManagerWindow->show();
    m_volumeManagerWindow->raise();
    m_volumeManagerWindow->activateWindow();
}

void MainWindow::showProductSearch() {
    if (!m_productSearchWindow) {
        m_productSearchWindow = new ProductSearchWindow();
        m_productSearchWindow->setWindowFlag(Qt::Window);
    }
    m_productSearchWindow->show();
    m_productSearchWindow->raise();
    m_productSearchWindow->activateWindow();
}

void MainWindow::showWorkSearch() {
    if (!m_workSearchWindow) {
        m_workSearchWindow = new WorkSearchWindow();
        m_workSearchWindow->setWindowFlag(Qt::Window);
    }
    m_workSearchWindow->show();
    m_workSearchWindow->raise();
    m_workSearchWindow->activateWindow();
}

void MainWindow::showSyncDialog() {
    if (!m_syncDialog) {
        m_syncDialog = new ProgressDialog("同步");
        m_syncDialog->setWindowFlag(Qt::Window);
    }
    m_syncDialog->setStatus("准备同步...");
    m_syncDialog->setProgress(0);
    m_syncDialog->show();
    m_syncDialog->raise();
    m_syncDialog->activateWindow();

    // 使用 QThread 确保有事件循环
    auto *thread = new QThread(this);
    auto *worker = new SyncWorker();
    worker->moveToThread(thread);

    // 连接取消信号 - 强制终止线程
    connect(m_syncDialog, &ProgressDialog::cancelled, this, [thread, worker]() {
        thread->terminate();
        thread->wait();
    });

    connect(thread, &QThread::started, worker, &SyncWorker::doWork);
    connect(worker, &SyncWorker::progressUpdated, this, [this](qint32 current, qint32 total, const QString &message) {
        if (m_syncDialog) {
            const qint32 progress = total > 0 ? static_cast<qint32>((current * 100.0) / total) : 0;
            m_syncDialog->setProgress(progress);
            m_syncDialog->setStatus(message);
        }
        appendLog(QString("%1/%2: %3").arg(current).arg(total).arg(message));
    });
    connect(worker, &SyncWorker::finished, this, [this, thread, worker](const TorrentSyncResult &result) {
        if (m_syncDialog) {
            if (result.success) {
                m_syncDialog->setStatus(
                    QStringLiteral("同步完成: 新增 %1, 更新 %2, 总计 %3")
                    .arg(result.newCount)
                    .arg(result.updateCount)
                    .arg(result.total));
            } else {
                m_syncDialog->setStatus(
                    QStringLiteral("同步失败: %1")
                    .arg(result.error));
            }
            m_syncDialog->setProgress(100);
        }
        thread->quit();
        thread->wait();
        thread->deleteLater();
        worker->deleteLater();
    });

    thread->start();
}

void MainWindow::showLinkDialog() {
    if (!m_linkDialog) {
        m_linkDialog = new ProgressDialog("关联");
        m_linkDialog->setWindowFlag(Qt::Window);
    }
    m_linkDialog->setStatus("准备关联产品...");
    m_linkDialog->setProgress(0);
    m_linkDialog->show();
    m_linkDialog->raise();
    m_linkDialog->activateWindow();

    // 使用 QThread 确保有事件循环
    auto *thread = new QThread(this);
    auto *worker = new LinkWorker();
    worker->moveToThread(thread);

    // 连接取消信号 - 强制终止线程
    connect(m_linkDialog, &ProgressDialog::cancelled, this, [thread, worker]() {
        thread->terminate();
        thread->wait();
    });

    connect(thread, &QThread::started, worker, &LinkWorker::doWork);
    connect(worker, &LinkWorker::progressUpdated, this, [this](qint32 current, qint32 total, const QString &message) {
        if (m_linkDialog) {
            const qint32 progress = total > 0 ? static_cast<qint32>((current * 100.0) / total) : 0;
            m_linkDialog->setProgress(progress);
            m_linkDialog->setStatus(message);
        }
        appendLog(QString("%1/%2: %3").arg(current).arg(total).arg(message));
    });
    connect(worker, &LinkWorker::finished, this, [this, thread, worker](const BddbRepository::LinkResult &result) {
        if (m_linkDialog) {
            m_linkDialog->setStatus(
                QStringLiteral("关联完成: 更新 %1, 匹配 %2, 跳过 %3")
                .arg(result.updated)
                .arg(result.matched)
                .arg(result.skipped));
            m_linkDialog->setProgress(100);
        }
        thread->quit();
        thread->wait();
        thread->deleteLater();
        worker->deleteLater();
    });

    thread->start();
}
