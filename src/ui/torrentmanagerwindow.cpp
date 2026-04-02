#include "torrentmanagerwindow.h"
#include "torrentmodel.h"
#include "db/bddbrepository.h"
#include "api/qbittorrentclient.h"
#include "ui/progressdialog.h"
#include <QLineEdit>
#include <QTableView>
#include <QVBoxLayout>
#include <QWidget>
#include <QPushButton>
#include <QLabel>
#include <QtConcurrent>
#include <QFutureWatcher>
#include <QMessageBox>

TorrentManagerWindow::TorrentManagerWindow(QWidget *parent)
    : QMainWindow(parent) {
    setupUI();
    setWindowTitle("种子管理");
    resize(600, 900);
    setMinimumSize(500, 600);
    setAttribute(Qt::WA_DeleteOnClose);

    // 延迟加载数据
    QTimer::singleShot(0, this, &TorrentManagerWindow::loadData);
}

TorrentManagerWindow::~TorrentManagerWindow() = default;

void TorrentManagerWindow::setupUI() {
    auto *centralWidget = new QWidget(this);
    setCentralWidget(centralWidget);

    auto *layout = new QVBoxLayout(centralWidget);

    // 搜索栏
    auto *searchLayout = new QHBoxLayout();
    m_searchEdit = new QLineEdit(this);
    m_searchEdit->setPlaceholderText("搜索...");
    connect(m_searchEdit, &QLineEdit::textChanged, this, &TorrentManagerWindow::onSearchTextChanged);
    searchLayout->addWidget(m_searchEdit);
    searchLayout->addStretch();
    layout->addLayout(searchLayout);

    // 列表 - 使用自定义 Model + QTableView
    m_model = new TorrentModel(this);
    m_tableView = new QTableView(this);
    m_tableView->setModel(m_model);
    m_tableView->setSelectionBehavior(QAbstractItemView::SelectRows);
    m_tableView->setSelectionMode(QAbstractItemView::SingleSelection);
    m_tableView->setAlternatingRowColors(true);
    layout->addWidget(m_tableView);

    // 底部按钮栏 - 同步种子
    auto *bottomLayout = new QHBoxLayout();
    bottomLayout->addStretch();

    m_syncBtn = new QPushButton("同步 qBittorrent 种子", this);
    connect(m_syncBtn, &QPushButton::clicked, this, &TorrentManagerWindow::onSyncTorrents);
    bottomLayout->addWidget(m_syncBtn);

    layout->addLayout(bottomLayout);
}

void TorrentManagerWindow::loadData() {
    // 在后台线程加载数据
    auto *watcher = new QFutureWatcher<DbResult<QList<Torrent> > >(this);
    connect(watcher, &QFutureWatcher<DbResult<QList<Torrent> > >::finished, this, [this, watcher] {
        if (auto result = watcher->result()) {
            m_model->setTorrents(std::move(*result));
        }
        watcher->deleteLater();
    });

    const auto future = QtConcurrent::run([]() -> DbResult<QList<Torrent> > {
        return BddbRepository::loadTorrents(false);
    });
    watcher->setFuture(future);
}

void TorrentManagerWindow::onSearchTextChanged(const QString &text) {
    // TODO: 实现搜索过滤
    Q_UNUSED(text)
}

void TorrentManagerWindow::onSyncTorrents() {
    auto *client = new QBittorrentClient(this);

    auto *dialog = new ProgressDialog("同步种子", nullptr);
    dialog->setWindowFlag(Qt::Window);
    dialog->setAttribute(Qt::WA_DeleteOnClose);

    // 使用 QtConcurrent::run 在线程中执行，但 ProgressDialog::execTask 阻塞 UI
    auto future = client->syncTorrents();

    // 当对话框关闭时删除 client
    connect(dialog, &QObject::destroyed, client, &QObject::deleteLater);

    // 完成后刷新列表
    connect(dialog, &ProgressDialog::finished, this, [this](int result) {
        if (result == QDialog::Accepted) {
            loadData();  // 刷新列表
        }
    });

    dialog->execTask(future);
}
