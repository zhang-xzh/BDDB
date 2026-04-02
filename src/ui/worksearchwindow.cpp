#include "worksearchwindow.h"
#include "ui/progressdialog.h"
#include "search/bangumisync.h"
#include <QLineEdit>
#include <QPushButton>
#include <QTableWidget>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QWidget>

WorkSearchWindow::WorkSearchWindow(QWidget *parent)
    : QMainWindow(parent) {
    setupUI();
    setWindowTitle("作品搜索");
    resize(900, 700);
    setMinimumSize(600, 500);
    setAttribute(Qt::WA_DeleteOnClose);
}

WorkSearchWindow::~WorkSearchWindow() = default;

void WorkSearchWindow::setupUI() {
    auto *centralWidget = new QWidget(this);
    setCentralWidget(centralWidget);

    auto *layout = new QVBoxLayout(centralWidget);

    auto *searchLayout = new QHBoxLayout();
    auto *searchEdit = new QLineEdit(this);
    searchEdit->setPlaceholderText("搜索作品...");
    searchLayout->addWidget(searchEdit);
    auto *searchBtn = new QPushButton("搜索", this);
    searchLayout->addWidget(searchBtn);
    layout->addLayout(searchLayout);

    auto *table = new QTableWidget(this);
    table->setColumnCount(4);
    table->setHorizontalHeaderLabels(QStringList{"作品名", "原名", "年份", "类型"});
    layout->addWidget(table, 1);

    auto *bottomLayout = new QHBoxLayout();
    bottomLayout->addStretch();
    auto *rebuildBtn = new QPushButton("重建Bangumi", this);
    connect(rebuildBtn, &QPushButton::clicked, this, &WorkSearchWindow::showRebuildBangumiDialog);
    bottomLayout->addWidget(rebuildBtn);
    layout->addLayout(bottomLayout);
}

void WorkSearchWindow::showRebuildBangumiDialog() {
    auto *dialog = new ProgressDialog("重建 Bangumi 索引", nullptr);
    dialog->setWindowFlag(Qt::Window);
    dialog->setAttribute(Qt::WA_DeleteOnClose);
    
    dialog->setTask([](ProgressDialog *d) {
        BangumiSyncService::rebuildIndexSync([d](int processed, int total) {
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
