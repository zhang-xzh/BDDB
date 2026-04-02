#include "progressdialog.h"
#include <QProgressBar>
#include <QLabel>
#include <QVBoxLayout>
#include <QPushButton>
#include <QHBoxLayout>

ProgressDialog::ProgressDialog(const QString &title, QWidget *parent)
    : QDialog(parent) {
    setupUI();
    setWindowTitle(title);
    resize(400, 120);
    setMinimumSize(300, 100);
    setAttribute(Qt::WA_DeleteOnClose);
    // 移除关闭按钮，只能通过取消按钮关闭
    setWindowFlags(windowFlags() & ~Qt::WindowCloseButtonHint);
}

void ProgressDialog::setStatus(const QString &text) {
    m_statusLabel->setText(text);
}

void ProgressDialog::setProgress(qint32 value) {
    m_progressBar->setValue(value);
}

void ProgressDialog::onCancelClicked() {
    if (!m_cancelled) {
        m_cancelled = true;
        m_cancelBtn->setEnabled(false);
        m_cancelBtn->setText("正在取消...");
        m_statusLabel->setText("正在取消操作...");
        emit cancelled();
    }
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
    btnLayout->addWidget(m_cancelBtn);
    layout->addLayout(btnLayout);

    connect(m_cancelBtn, &QPushButton::clicked, this, &ProgressDialog::onCancelClicked);
}
