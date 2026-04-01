#include "productsearchwindow.h"
#include <QHBoxLayout>
#include <QLineEdit>
#include <QPushButton>
#include <QTableWidget>
#include <QVBoxLayout>
#include <QWidget>

ProductSearchWindow::ProductSearchWindow(QWidget *parent)
    : QMainWindow(parent) {
    setupUI();
    setWindowTitle("产品搜索");
    resize(900, 700);
    setMinimumSize(600, 500);
    setAttribute(Qt::WA_DeleteOnClose);
}

ProductSearchWindow::~ProductSearchWindow() = default;

void ProductSearchWindow::setupUI() {
    auto *centralWidget = new QWidget(this);
    setCentralWidget(centralWidget);

    auto *layout = new QVBoxLayout(centralWidget);

    // 搜索栏
    auto *searchLayout = new QHBoxLayout();
    auto *searchEdit = new QLineEdit(this);
    searchEdit->setPlaceholderText("搜索产品...");
    searchLayout->addWidget(searchEdit);
    auto *searchBtn = new QPushButton("搜索", this);
    searchLayout->addWidget(searchBtn);
    layout->addLayout(searchLayout);

    // 结果列表
    auto *table = new QTableWidget(this);
    table->setColumnCount(4);
    table->setHorizontalHeaderLabels(QStringList{"品番", "标题", "价格", "链接"});
    layout->addWidget(table, 1);

    // 底部按钮
    auto *bottomLayout = new QHBoxLayout();
    bottomLayout->addStretch();
    auto *selectBtn = new QPushButton("选择", this);
    auto *closeBtn = new QPushButton("关闭", this);
    bottomLayout->addWidget(selectBtn);
    bottomLayout->addWidget(closeBtn);
    layout->addLayout(bottomLayout);
}
