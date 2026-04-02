#include "core/mainwindow.h"
#include "ui/torrentmanagerwindow.h"
#include "ui/volumemanagerwindow.h"
#include "ui/productsearchwindow.h"
#include "ui/worksearchwindow.h"
#include "ui/progressdialog.h"
#include <QApplication>
#include <QGroupBox>
#include <QPushButton>
#include <QVBoxLayout>
#include <QWidget>

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

    // 主内容区 - 水平排列各分组
    auto *centralWidget = new QWidget(this);
    centralWidget->setFont(antialiasedFont);
    auto *mainLayout = new QHBoxLayout(centralWidget);
    mainLayout->setSpacing(12);
    mainLayout->setContentsMargins(12, 8, 12, 8);
    setCentralWidget(centralWidget);

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

    mainLayout->addWidget(groupManage);

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

    mainLayout->addWidget(groupSearch);

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

    mainLayout->addWidget(groupData);

    // 索引分组 - 垂直按钮布局
    auto *groupIndex = new QGroupBox("索引", this);
    groupIndex->setFont(antialiasedFont);
    auto *layoutIndex = new QVBoxLayout(groupIndex);
    layoutIndex->setSpacing(8);
    layoutIndex->setContentsMargins(8, 12, 8, 8);

    auto *btnRebuildBangumi = new QPushButton("重建Bangumi", this);
    btnRebuildBangumi->setFont(antialiasedFont);
    connect(btnRebuildBangumi, &QPushButton::clicked, this, &MainWindow::showRebuildBangumiDialog);
    layoutIndex->addWidget(btnRebuildBangumi);

    auto *btnRebuildSuruga = new QPushButton("重建suruga-ya", this);
    btnRebuildSuruga->setFont(antialiasedFont);
    connect(btnRebuildSuruga, &QPushButton::clicked, this, &MainWindow::showRebuildSurugaDialog);
    layoutIndex->addWidget(btnRebuildSuruga);

    mainLayout->addWidget(groupIndex);

    // 自适应窗口大小
    setFixedSize(sizeHint());
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
    m_syncDialog->setStatus("正在同步种子...");
    m_syncDialog->setProgress(0);
    m_syncDialog->show();
    m_syncDialog->raise();
    m_syncDialog->activateWindow();
}

void MainWindow::showLinkDialog() {
    if (!m_linkDialog) {
        m_linkDialog = new ProgressDialog("关联");
        m_linkDialog->setWindowFlag(Qt::Window);
    }
    m_linkDialog->setStatus("正在关联产品...");
    m_linkDialog->setProgress(0);
    m_linkDialog->show();
    m_linkDialog->raise();
    m_linkDialog->activateWindow();
}

void MainWindow::showRebuildBangumiDialog() {
    if (!m_rebuildBangumiDialog) {
        m_rebuildBangumiDialog = new ProgressDialog("重建 Bangumi 索引");
        m_rebuildBangumiDialog->setWindowFlag(Qt::Window);
    }
    m_rebuildBangumiDialog->setStatus("正在重建 Bangumi 索引...");
    m_rebuildBangumiDialog->setProgress(0);
    m_rebuildBangumiDialog->show();
    m_rebuildBangumiDialog->raise();
    m_rebuildBangumiDialog->activateWindow();
}

void MainWindow::showRebuildSurugaDialog() {
    if (!m_rebuildSurugaDialog) {
        m_rebuildSurugaDialog = new ProgressDialog("重建 suruga-ya 索引");
        m_rebuildSurugaDialog->setWindowFlag(Qt::Window);
    }
    m_rebuildSurugaDialog->setStatus("正在重建 suruga-ya 索引...");
    m_rebuildSurugaDialog->setProgress(0);
    m_rebuildSurugaDialog->show();
    m_rebuildSurugaDialog->raise();
    m_rebuildSurugaDialog->activateWindow();
}
