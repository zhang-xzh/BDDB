#include "volumeeditorwindow.h"
#include <QFormLayout>
#include <QHBoxLayout>
#include <QLabel>
#include <QLineEdit>
#include <QListWidget>
#include <QTreeWidget>
#include <QWidget>

VolumeEditorWindow::VolumeEditorWindow(QWidget *parent)
    : QMainWindow(parent) {
    setupUI();
    setWindowTitle("分卷编辑器");
    resize(1000, 700);
    setMinimumSize(800, 500);
    setAttribute(Qt::WA_DeleteOnClose);
}

VolumeEditorWindow::~VolumeEditorWindow() = default;

void VolumeEditorWindow::setupUI() {
    auto *centralWidget = new QWidget(this);
    setCentralWidget(centralWidget);

    auto *layout = new QVBoxLayout(centralWidget);

    // 来源信息
    auto *sourceLayout = new QHBoxLayout();
    sourceLayout->addWidget(new QLabel("来自种子:", this));
    auto *sourceEdit = new QLineEdit(this);
    sourceEdit->setReadOnly(true);
    sourceLayout->addWidget(sourceEdit);
    layout->addLayout(sourceLayout);

    // 表单
    auto *formLayout = new QFormLayout();
    auto *catalogEdit = new QLineEdit(this);
    auto *volumeNameEdit = new QLineEdit(this);
    auto *volumeNoEdit = new QLineEdit(this);
    auto *volumeSetEdit = new QLineEdit(this);
    formLayout->addRow("catalog_no:", catalogEdit);
    formLayout->addRow("volume_name:", volumeNameEdit);
    formLayout->addRow("volume_no:", volumeNoEdit);
    formLayout->addRow("volume_set:", volumeSetEdit);
    layout->addLayout(formLayout);

    // 文件分配区
    auto *splitLayout = new QHBoxLayout();
    auto *leftTree = new QTreeWidget(this);
    leftTree->setHeaderLabel("种子文件");
    auto *rightList = new QListWidget(this);
    splitLayout->addWidget(leftTree);
    splitLayout->addWidget(rightList);
    layout->addLayout(splitLayout, 1);
}
