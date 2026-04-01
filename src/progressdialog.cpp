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
}

void ProgressDialog::setStatus(const QString &text) {
    m_statusLabel->setText(text);
}

void ProgressDialog::setProgress(int value) {
    m_progressBar->setValue(value);
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
    auto *cancelBtn = new QPushButton("取消", this);
    btnLayout->addWidget(cancelBtn);
    layout->addLayout(btnLayout);

    connect(cancelBtn, &QPushButton::clicked, this, &QDialog::reject);
}
