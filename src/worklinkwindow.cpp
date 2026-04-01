#include "worklinkwindow.h"
#include <QHBoxLayout>
#include <QLabel>
#include <QLineEdit>
#include <QPushButton>
#include <QTableWidget>
#include <QVBoxLayout>
#include <QWidget>

WorkLinkWindow::WorkLinkWindow(QWidget *parent)
    : QMainWindow(parent) {
    setupUI();
    setWindowTitle("作品关联");
    resize(1000, 700);
    setMinimumSize(800, 500);
    setAttribute(Qt::WA_DeleteOnClose);
}

WorkLinkWindow::~WorkLinkWindow() = default;

void WorkLinkWindow::setupUI() {
    auto *centralWidget = new QWidget(this);
    setCentralWidget(centralWidget);

    auto *layout = new QVBoxLayout(centralWidget);

    // 搜索栏
    auto *searchLayout = new QHBoxLayout();
    auto *searchEdit = new QLineEdit(this);
    searchEdit->setPlaceholderText("搜索作品...");
    searchLayout->addWidget(searchEdit);
    auto *searchBtn = new QPushButton("搜索", this);
    searchLayout->addWidget(searchBtn);
    layout->addLayout(searchLayout);

    // 作品列表
    auto *table = new QTableWidget(this);
    table->setColumnCount(3);
    table->setHorizontalHeaderLabels(QStringList{"作品名", "年份", "类型"});
    layout->addWidget(table, 1);

    // 已关联作品
    auto *linkedLabel = new QLabel("已关联作品:", this);
    layout->addWidget(linkedLabel);

    auto *linkedTable = new QTableWidget(this);
    linkedTable->setColumnCount(2);
    linkedTable->setHorizontalHeaderLabels(QStringList{"作品名", "操作"});
    layout->addWidget(linkedTable);

    // 底部按钮
    auto *bottomLayout = new QHBoxLayout();
    bottomLayout->addStretch();
    auto *saveBtn = new QPushButton("保存", this);
    auto *cancelBtn = new QPushButton("取消", this);
    bottomLayout->addWidget(saveBtn);
    bottomLayout->addWidget(cancelBtn);
    layout->addLayout(bottomLayout);
}
