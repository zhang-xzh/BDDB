#include "torrentmanagerwindow.h"
#include <QLabel>
#include <QLineEdit>
#include <QPushButton>
#include <QTableWidget>
#include <QVBoxLayout>
#include <QWidget>

TorrentManagerWindow::TorrentManagerWindow(QWidget *parent)
    : QMainWindow(parent) {
    setupUI();
    setWindowTitle("种子管理");
    resize(600, 900);
    setMinimumSize(500, 600);
    setAttribute(Qt::WA_DeleteOnClose);
}

TorrentManagerWindow::~TorrentManagerWindow() = default;

void TorrentManagerWindow::setupUI() {
    auto *centralWidget = new QWidget(this);
    setCentralWidget(centralWidget);

    auto *layout = new QVBoxLayout(centralWidget);

    // 搜索栏
    auto *searchLayout = new QHBoxLayout();
    auto *searchEdit = new QLineEdit(this);
    searchEdit->setPlaceholderText("搜索...");
    searchLayout->addWidget(searchEdit);
    searchLayout->addStretch();
    layout->addLayout(searchLayout);

    // 列表
    auto *table = new QTableWidget(this);
    table->setColumnCount(2);
    table->setHorizontalHeaderLabels(QStringList{"状态", "种子名"});
    layout->addWidget(table);

    // 底部操作栏
    auto *bottomLayout = new QHBoxLayout();
    auto *statusLabel = new QLabel("选中: -", this);
    auto *openEditorBtn = new QPushButton("编辑分卷", this);
    bottomLayout->addWidget(statusLabel);
    bottomLayout->addStretch();
    bottomLayout->addWidget(openEditorBtn);
    layout->addLayout(bottomLayout);
}
