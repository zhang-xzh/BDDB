#include "core/mainwindow.h"
#include "ui/torrentmanagerwindow.h"
#include "ui/volumemanagerwindow.h"
#include "ui/volumeeditorwindow.h"
#include "ui/mediaeditorwindow.h"
#include "ui/worklinkwindow.h"
#include "ui/productsearchwindow.h"
#include "ui/worksearchwindow.h"
#include "ui/progressdialog.h"
#include <QToolBar>
#include <QToolButton>
#include <QVBoxLayout>
#include <QWidget>

MainWindow::MainWindow(QWidget *parent)
    : QMainWindow(parent) {
    setupUI();
    setWindowTitle("BDDB");
    resize(600, 100);
    setMinimumSize(600, 100);
}

MainWindow::~MainWindow() = default;

void MainWindow::setupUI() {
    // 主内容区
    auto *centralWidget = new QWidget(this);
    setCentralWidget(centralWidget);

    // Ribbon 工具栏
    auto *toolBar = addToolBar("Main");
    toolBar->setMovable(false);

    // 种子管理
    auto *btnTorrent = new QToolButton(this);
    btnTorrent->setText("种子管理");
    btnTorrent->setToolButtonStyle(Qt::ToolButtonTextBesideIcon);
    connect(btnTorrent, &QToolButton::clicked, this, &MainWindow::showTorrentManager);
    toolBar->addWidget(btnTorrent);

    // 分卷管理
    auto *btnVolume = new QToolButton(this);
    btnVolume->setText("分卷管理");
    btnVolume->setToolButtonStyle(Qt::ToolButtonTextBesideIcon);
    connect(btnVolume, &QToolButton::clicked, this, &MainWindow::showVolumeManager);
    toolBar->addWidget(btnVolume);

    toolBar->addSeparator();

    // 产品搜索
    auto *btnProduct = new QToolButton(this);
    btnProduct->setText("产品搜索");
    btnProduct->setToolButtonStyle(Qt::ToolButtonTextBesideIcon);
    connect(btnProduct, &QToolButton::clicked, this, &MainWindow::showProductSearch);
    toolBar->addWidget(btnProduct);

    // 作品搜索
    auto *btnWork = new QToolButton(this);
    btnWork->setText("作品搜索");
    btnWork->setToolButtonStyle(Qt::ToolButtonTextBesideIcon);
    connect(btnWork, &QToolButton::clicked, this, &MainWindow::showWorkSearch);
    toolBar->addWidget(btnWork);

    toolBar->addSeparator();

    // 同步
    auto *btnSync = new QToolButton(this);
    btnSync->setText("同步种子");
    btnSync->setToolButtonStyle(Qt::ToolButtonTextBesideIcon);
    connect(btnSync, &QToolButton::clicked, this, &MainWindow::showSyncDialog);
    toolBar->addWidget(btnSync);

    // 关联
    auto *btnLink = new QToolButton(this);
    btnLink->setText("关联产品");
    btnLink->setToolButtonStyle(Qt::ToolButtonTextBesideIcon);
    connect(btnLink, &QToolButton::clicked, this, &MainWindow::showLinkDialog);
    toolBar->addWidget(btnLink);
}

void MainWindow::showTorrentManager() {
    if (!m_torrentManagerWindow) {
        m_torrentManagerWindow = new TorrentManagerWindow(this);
    }
    m_torrentManagerWindow->show();
    m_torrentManagerWindow->raise();
    m_torrentManagerWindow->activateWindow();
}

void MainWindow::showVolumeManager() {
    if (!m_volumeManagerWindow) {
        m_volumeManagerWindow = new VolumeManagerWindow(this);
    }
    m_volumeManagerWindow->show();
    m_volumeManagerWindow->raise();
    m_volumeManagerWindow->activateWindow();
}

void MainWindow::showProductSearch() {
    if (!m_productSearchWindow) {
        m_productSearchWindow = new ProductSearchWindow(this);
    }
    m_productSearchWindow->show();
    m_productSearchWindow->raise();
    m_productSearchWindow->activateWindow();
}

void MainWindow::showWorkSearch() {
    if (!m_workSearchWindow) {
        m_workSearchWindow = new WorkSearchWindow(this);
    }
    m_workSearchWindow->show();
    m_workSearchWindow->raise();
    m_workSearchWindow->activateWindow();
}

void MainWindow::showSyncDialog() {
    if (!m_syncDialog) {
        m_syncDialog = new ProgressDialog("同步", this);
    }
    m_syncDialog->setStatus("正在同步...");
    m_syncDialog->setProgress(0);
    m_syncDialog->show();
    m_syncDialog->raise();
    m_syncDialog->activateWindow();
}

void MainWindow::showLinkDialog() {
    if (!m_linkDialog) {
        m_linkDialog = new ProgressDialog("关联", this);
    }
    m_linkDialog->setStatus("正在关联...");
    m_linkDialog->setProgress(0);
    m_linkDialog->show();
    m_linkDialog->raise();
    m_linkDialog->activateWindow();
}
