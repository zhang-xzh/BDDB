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
#include <QFutureWatcher>

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
    if (m_syncDialog) {
        m_syncDialog->raise();
        m_syncDialog->activateWindow();
        return;
    }

    m_syncDialog = new ProgressDialog("同步", nullptr);
    m_syncDialog->setAttribute(Qt::WA_DeleteOnClose);
    m_syncDialog->setWindowFlag(Qt::Window);
    connect(m_syncDialog, &QObject::destroyed, this, [this]() { m_syncDialog = nullptr; });

    auto *watcher = new QFutureWatcher<TorrentSyncResult>();
    connect(watcher, &QFutureWatcher<TorrentSyncResult>::finished, watcher, [this, watcher]() {
        if (m_syncDialog) {
            if (!watcher->isCanceled()) {
                auto result = watcher->result();
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
            } else {
                m_syncDialog->setStatus("已取消");
                m_syncDialog->setProgress(0);
            }
        }
        watcher->deleteLater();
    });

    connect(m_syncDialog, &ProgressDialog::cancelled, watcher, [watcher]() {
        watcher->cancel();
    });
    
    connect(m_syncDialog, &QObject::destroyed, watcher, [watcher]() {
        watcher->cancel();
    });

    QBittorrentClient client;
    auto future = client.syncTorrents();
    watcher->setFuture(future);
    m_syncDialog->show();
}

void MainWindow::showLinkDialog() {
    if (m_linkDialog) {
        m_linkDialog->raise();
        m_linkDialog->activateWindow();
        return;
    }

    m_linkDialog = new ProgressDialog("关联", nullptr);
    m_linkDialog->setAttribute(Qt::WA_DeleteOnClose);
    m_linkDialog->setWindowFlag(Qt::Window);
    connect(m_linkDialog, &QObject::destroyed, this, [this]() { m_linkDialog = nullptr; });

    auto *watcher = new QFutureWatcher<BddbRepository::LinkResult>();
    connect(watcher, &QFutureWatcher<BddbRepository::LinkResult>::finished, watcher, [this, watcher]() {
        if (m_linkDialog) {
            if (!watcher->isCanceled()) {
                auto result = watcher->result();
                m_linkDialog->setStatus(
                    QStringLiteral("关联完成: 更新 %1, 匹配 %2, 跳过 %3")
                    .arg(result.updated)
                    .arg(result.matched)
                    .arg(result.skipped));
                m_linkDialog->setProgress(100);
            } else {
                m_linkDialog->setStatus("已取消");
                m_linkDialog->setProgress(0);
            }
        }
        watcher->deleteLater();
    });

    connect(m_linkDialog, &ProgressDialog::cancelled, watcher, [watcher]() {
        watcher->cancel();
    });
    
    connect(m_linkDialog, &QObject::destroyed, watcher, [watcher]() {
        watcher->cancel();
    });

    auto future = BddbRepository::linkVolumesToProducts();
    watcher->setFuture(future);
    m_linkDialog->show();
}
