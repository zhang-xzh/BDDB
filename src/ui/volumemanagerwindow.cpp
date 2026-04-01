#include "volumemanagerwindow.h"
#include "models/volumemodel.h"
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

    // 底部操作栏
    auto *bottomLayout = new QHBoxLayout();
    auto *countLabel = new QLabel("已选 0 项", this);
    auto *editVolumeBtn = new QPushButton("编辑分卷", this);
    auto *editMediaBtn = new QPushButton("编辑媒介", this);
    auto *linkWorkBtn = new QPushButton("编辑作品", this);
    bottomLayout->addWidget(countLabel);
    bottomLayout->addStretch();
    bottomLayout->addWidget(editVolumeBtn);
    bottomLayout->addWidget(editMediaBtn);
    bottomLayout->addWidget(linkWorkBtn);
    layout->addLayout(bottomLayout);
}

void VolumeManagerWindow::loadData() {
    auto *watcher = new QFutureWatcher<DbResult<std::vector<Volume>>>(this);
    connect(watcher, &QFutureWatcher<DbResult<std::vector<Volume>>>::finished, this, [this, watcher]() {
        auto result = watcher->result();
        if (result) {
            m_model->setVolumes(std::move(*result));
        }
        watcher->deleteLater();
    });

    auto future = QtConcurrent::run([]() -> DbResult<std::vector<Volume>> {
        return BddbRepository::getAllVolumes();
    });
    watcher->setFuture(future);
}
