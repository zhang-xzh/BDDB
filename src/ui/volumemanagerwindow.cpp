#include "volumemanagerwindow.h"
#include "volumemodel.h"
#include "db/bddbrepository.h"
#include <QLabel>
#include <QLineEdit>
#include <QPushButton>
#include <QTableView>
#include <QVBoxLayout>
#include <QWidget>
#include <QTimer>
#include <QtConcurrent>
#include <QFutureWatcher>

VolumeManagerWindow::VolumeManagerWindow(QWidget *parent)
    : QMainWindow(parent) {
    setupUI();
    setWindowTitle("分卷管理");
    resize(600, 900);
    setMinimumSize(500, 600);
    setAttribute(Qt::WA_DeleteOnClose);

    QTimer::singleShot(0, this, &VolumeManagerWindow::loadData);
}

VolumeManagerWindow::~VolumeManagerWindow() = default;

void VolumeManagerWindow::setupUI() {
    auto *centralWidget = new QWidget(this);
    setCentralWidget(centralWidget);

    auto *layout = new QVBoxLayout(centralWidget);

    // 搜索栏
    auto *searchLayout = new QHBoxLayout();
    m_codeEdit = new QLineEdit(this);
    m_codeEdit->setPlaceholderText("编号...");
    m_titleEdit = new QLineEdit(this);
    m_titleEdit->setPlaceholderText("标题...");
    searchLayout->addWidget(m_codeEdit);
    searchLayout->addWidget(m_titleEdit);
    searchLayout->addStretch();
    layout->addLayout(searchLayout);

    // 列表 - 使用自定义 Model + QTableView
    m_model = new VolumeModel(this);
    m_tableView = new QTableView(this);
    m_tableView->setModel(m_model);
    m_tableView->setSelectionBehavior(QAbstractItemView::SelectRows);
    m_tableView->setSelectionMode(QAbstractItemView::ExtendedSelection);
    m_tableView->setAlternatingRowColors(true);
    layout->addWidget(m_tableView);
}

void VolumeManagerWindow::loadData() {
    auto *watcher = new QFutureWatcher<DbResult<QList<Volume> > >(this);
    connect(watcher, &QFutureWatcher<DbResult<QList<Volume> > >::finished, this, [this, watcher]() {
        auto result = watcher->result();
        if (result) {
            m_model->setVolumes(std::move(*result));
        }
        watcher->deleteLater();
    });

    auto future = QtConcurrent::run([]() -> DbResult<QList<Volume> > {
        return BddbRepository::getAllVolumes();
    });
    watcher->setFuture(future);
}
