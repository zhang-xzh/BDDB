#include "mediaeditorwindow.h"
#include <QFormLayout>
#include <QHBoxLayout>
#include <QLabel>
#include <QLineEdit>
#include <QPushButton>
#include <QTableWidget>
#include <QVBoxLayout>
#include <QWidget>

MediaEditorWindow::MediaEditorWindow(QWidget *parent)
    : QMainWindow(parent) {
    setupUI();
    setWindowTitle("媒介编辑器");
    resize(1000, 700);
    setMinimumSize(800, 500);
    setAttribute(Qt::WA_DeleteOnClose);
}

MediaEditorWindow::~MediaEditorWindow() = default;

void MediaEditorWindow::setupUI() {
    auto *centralWidget = new QWidget(this);
    setCentralWidget(centralWidget);

    auto *layout = new QVBoxLayout(centralWidget);

    // 基本信息表单
    auto *formLayout = new QFormLayout();
    auto *typeEdit = new QLineEdit(this);
    auto *modelEdit = new QLineEdit(this);
    formLayout->addRow("媒介类型:", typeEdit);
    formLayout->addRow("型番:", modelEdit);
    layout->addLayout(formLayout);

    // 媒介列表
    auto *table = new QTableWidget(this);
    table->setColumnCount(3);
    table->setHorizontalHeaderLabels(QStringList{"类型", "型番", "备注"});
    layout->addWidget(table, 1);

    // 底部按钮
    auto *bottomLayout = new QHBoxLayout();
    bottomLayout->addStretch();
    auto *saveBtn = new QPushButton("保存", this);
    auto *cancelBtn = new QPushButton("取消", this);
    bottomLayout->addWidget(saveBtn);
    bottomLayout->addWidget(cancelBtn);
    layout->addLayout(bottomLayout);
}
