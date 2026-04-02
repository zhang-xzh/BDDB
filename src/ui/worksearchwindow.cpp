#include "worksearchwindow.h"
#include "ui/progressdialog.h"
#include "search/bangumisync.h"
#include <QLineEdit>
#include <QPushButton>
#include <QTableWidget>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QWidget>
#include <QtConcurrent>
#include <QFutureWatcher>

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
    if (m_dialog) {
        m_dialog->raise();
        m_dialog->activateWindow();
        return;
    }

    m_dialog = new ProgressDialog("重建 Bangumi 索引", this);
    m_dialog->setAttribute(Qt::WA_DeleteOnClose);
    connect(m_dialog, &QObject::destroyed, this, [this]() { m_dialog = nullptr; });

    auto *watcher = new QFutureWatcher<void>(this);
    connect(watcher, &QFutureWatcher<void>::finished, this, [this, watcher]() {
        watcher->deleteLater();
        if (m_dialog) {
            m_dialog->setStatus("完成");
            m_dialog->setProgress(100);
        }
    });

    connect(m_dialog, &ProgressDialog::cancelled, this, [watcher]() {
        watcher->cancel();
    });

    auto future = QtConcurrent::run([this]() {
        BangumiSyncService::rebuildIndex([this](qint32 processed, qint32 total) {
            if (m_dialog) {
                QMetaObject::invokeMethod(this, [this, processed, total]() {
                    if (m_dialog) {
                        qint32 progress = total > 0 ? (processed * 100 / total) : 0;
                        m_dialog->setProgress(progress);
                        m_dialog->setStatus(QString("%1/%2").arg(processed).arg(total));
                    }
                }, Qt::QueuedConnection);
            }
        });
    });

    watcher->setFuture(future);
    m_dialog->show();
}
