#include "productsearchwindow.h"
#include "ui/progressdialog.h"
#include <QLineEdit>
#include <QPushButton>
#include <QTableWidget>
#include <QVBoxLayout>
#include <QWidget>
#include <QThread>

void SurugaRebuildWorker::doWork() {
    auto result = ProductSyncService::rebuildIndex(
        [this](int processed, int total) {
            emit progressUpdated(processed, total, QString("Processing %1/%2").arg(processed).arg(total));
        }
    );
    emit finished(result);
}

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
    auto *rebuildBtn = new QPushButton("重建索引", this);
    connect(rebuildBtn, &QPushButton::clicked, this, &ProductSearchWindow::showRebuildSurugaDialog);
    bottomLayout->addWidget(rebuildBtn);
    layout->addLayout(bottomLayout);
}

void ProductSearchWindow::showRebuildSurugaDialog() {
    if (!m_rebuildSurugaDialog) {
        m_rebuildSurugaDialog = new ProgressDialog("重建 suruga-ya 索引");
        m_rebuildSurugaDialog->setWindowFlag(Qt::Window);
    }
    m_rebuildSurugaDialog->setStatus("准备重建 suruga-ya 索引...");
    m_rebuildSurugaDialog->setProgress(0);
    m_rebuildSurugaDialog->show();
    m_rebuildSurugaDialog->raise();
    m_rebuildSurugaDialog->activateWindow();

    // 使用 QThread 确保有事件循环
    auto *thread = new QThread(this);
    auto *worker = new SurugaRebuildWorker();
    worker->moveToThread(thread);

    // 连接取消信号 - 强制终止线程
    connect(m_rebuildSurugaDialog, &ProgressDialog::cancelled, this, [thread, worker]() {
        thread->terminate();
        thread->wait();
    });

    connect(thread, &QThread::started, worker, &SurugaRebuildWorker::doWork);
    connect(worker, &SurugaRebuildWorker::progressUpdated, this, [this](int current, int total, const QString &message) {
        if (m_rebuildSurugaDialog) {
            const int progress = total > 0 ? static_cast<int>((current * 100.0) / total) : 0;
            m_rebuildSurugaDialog->setProgress(progress);
            m_rebuildSurugaDialog->setStatus(message);
        }
    });
    connect(worker, &SurugaRebuildWorker::finished, this, [this, thread, worker](const SearchResult<SyncResult> &result) {
        if (m_rebuildSurugaDialog) {
            if (result) {
                m_rebuildSurugaDialog->setStatus(
                    QStringLiteral("重建完成: 总计 %1, 索引 %2, 失败 %3")
                    .arg(result->total)
                    .arg(result->indexed)
                    .arg(result->failed));
            } else {
                m_rebuildSurugaDialog->setStatus(
                    QStringLiteral("重建失败: %1")
                    .arg(QString::fromStdString(result.error())));
            }
            m_rebuildSurugaDialog->setProgress(100);
        }
        thread->quit();
        thread->wait();
        thread->deleteLater();
        worker->deleteLater();
    });

    thread->start();
}
