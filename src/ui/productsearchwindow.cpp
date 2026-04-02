#include "productsearchwindow.h"
#include "ui/progressdialog.h"
#include "search/productsync.h"
#include <QLineEdit>
#include <QPushButton>
#include <QTableWidget>
#include <QVBoxLayout>
#include <QHBoxLayout>
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

    auto *searchLayout = new QHBoxLayout();
    auto *searchEdit = new QLineEdit(this);
    searchEdit->setPlaceholderText("搜索产品...");
    searchLayout->addWidget(searchEdit);
    auto *searchBtn = new QPushButton("搜索", this);
    searchLayout->addWidget(searchBtn);
    layout->addLayout(searchLayout);

    auto *table = new QTableWidget(this);
    table->setColumnCount(4);
    table->setHorizontalHeaderLabels(QStringList{"品番", "标题", "价格", "链接"});
    layout->addWidget(table, 1);

    auto *bottomLayout = new QHBoxLayout();
    bottomLayout->addStretch();
    auto *rebuildBtn = new QPushButton("重建suruga-ya", this);
    connect(rebuildBtn, &QPushButton::clicked, this, &ProductSearchWindow::showRebuildSurugaDialog);
    bottomLayout->addWidget(rebuildBtn);
    layout->addLayout(bottomLayout);
}

void ProductSearchWindow::showRebuildSurugaDialog() {
    auto *dialog = new ProgressDialog("重建 suruga-ya 索引", nullptr);
    dialog->setWindowFlag(Qt::Window);
    dialog->setAttribute(Qt::WA_DeleteOnClose);
    
    dialog->setTask([](ProgressDialog *d) {
        ProductSyncService::rebuildIndexSync([d](int processed, int total) {
            QMetaObject::invokeMethod(d, [d, processed, total]() {
                if (d) {
                    int progress = total > 0 ? (processed * 100 / total) : 0;
                    d->setProgress(progress);
                    d->setStatus(QString("%1/%2").arg(processed).arg(total));
                }
            }, Qt::QueuedConnection);
        });
    });
    
    dialog->run();
}
