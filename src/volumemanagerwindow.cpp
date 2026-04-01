#include "volumemanagerwindow.h"
#include <QLabel>
#include <QLineEdit>
#include <QPushButton>
#include <QTableWidget>
#include <QVBoxLayout>
#include <QWidget>

VolumeManagerWindow::VolumeManagerWindow(QWidget *parent)
    : QMainWindow(parent) {
    setupUI();
    setWindowTitle("分卷管理");
    resize(600, 900);
    setMinimumSize(500, 600);
    setAttribute(Qt::WA_DeleteOnClose);
}

VolumeManagerWindow::~VolumeManagerWindow() = default;

void VolumeManagerWindow::setupUI() {
    auto *centralWidget = new QWidget(this);
    setCentralWidget(centralWidget);

    auto *layout = new QVBoxLayout(centralWidget);

    // 搜索栏
    auto *searchLayout = new QHBoxLayout();
    auto *codeEdit = new QLineEdit(this);
    codeEdit->setPlaceholderText("编号...");
    auto *titleEdit = new QLineEdit(this);
    titleEdit->setPlaceholderText("标题...");
    searchLayout->addWidget(codeEdit);
    searchLayout->addWidget(titleEdit);
    searchLayout->addStretch();
    layout->addLayout(searchLayout);

    // 列表
    auto *table = new QTableWidget(this);
    table->setColumnCount(2);
    table->setHorizontalHeaderLabels(QStringList{"编号", "标题"});
    layout->addWidget(table);

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
