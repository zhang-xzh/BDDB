#include "torrentmanagerwindow.h"
#include "torrentmodel.h"
#include "db/bddbrepository.h"
#include <QLineEdit>
#include <QTableView>
#include <QVBoxLayout>
#include <QWidget>
#include <QtConcurrent>
#include <QFutureWatcher>

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
