#include "progressdialog.h"
#include <QProgressBar>
#include <QLabel>
#include <QVBoxLayout>
#include <QPushButton>
#include <QHBoxLayout>
#include <QCloseEvent>

ProgressDialog::ProgressDialog(const QString &title, QWidget *parent)
    : QDialog(parent) {
    setupUI();
    setWindowTitle(title);
    resize(400, 120);
    setMinimumSize(300, 100);
    setAttribute(Qt::WA_DeleteOnClose);
    setWindowFlags(windowFlags() & ~Qt::WindowCloseButtonHint);
}

ProgressDialog::~ProgressDialog() {
    m_cancelled.store(true);
    if (m_thread.joinable()) {
        m_thread.detach();
    }
}

void ProgressDialog::setTask(TaskFunc task) {
    m_task = std::move(task);
}

void ProgressDialog::setStatus(const QString &text) {
    m_statusLabel->setText(text);
}

void ProgressDialog::setProgress(int value) {
    m_progressBar->setValue(value);
}

bool ProgressDialog::isCancelled() const {
    return m_cancelled.load();
}

void ProgressDialog::run() {
    show();
    
    if (m_task) {
        m_thread = std::thread([this]() {
            m_task(this);
            QMetaObject::invokeMethod(this, [this]() {
                emit taskFinished();
                close();
            }, Qt::QueuedConnection);
        });
    }
}

void ProgressDialog::closeEvent(QCloseEvent *event) {
    m_cancelled.store(true);
    event->accept();
}

void ProgressDialog::setupUI() {
    auto *layout = new QVBoxLayout(this);

    m_statusLabel = new QLabel("准备中...", this);
    layout->addWidget(m_statusLabel);

    m_progressBar = new QProgressBar(this);
    m_progressBar->setRange(0, 100);
    m_progressBar->setValue(0);
    layout->addWidget(m_progressBar);

    auto *btnLayout = new QHBoxLayout();
    btnLayout->addStretch();
    m_cancelBtn = new QPushButton("取消", this);
    connect(m_cancelBtn, &QPushButton::clicked, this, [this]() {
        emit cancelled();
        close();
    });
    btnLayout->addWidget(m_cancelBtn);
    layout->addLayout(btnLayout);
}
