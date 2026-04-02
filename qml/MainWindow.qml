import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick.Window

ApplicationWindow {
    id: root

    flags: Qt.Window | Qt.WindowTitleHint | Qt.WindowSystemMenuHint | Qt.WindowMinimizeButtonHint | Qt.WindowCloseButtonHint
    height: 500
    maximumHeight: 500
    maximumWidth: 700
    minimumHeight: 500
    minimumWidth: 700
    title: "BDDB"
    visible: true
    width: 700

    // 禁用最大化按钮
    onVisibilityChanged: {
        if (visibility === Window.Maximized) {
            visibility = Window.Windowed;
        }
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 12
        spacing: 12

        // 按钮区域
        RowLayout {
            Layout.fillWidth: true
            spacing: 12

            // 管理分组
            GroupBox {
                Layout.fillWidth: true
                title: "管理"

                ColumnLayout {
                    anchors.fill: parent
                    spacing: 8

                    Button {
                        Layout.fillWidth: true
                        text: "种子管理"

                        onClicked: mainViewModel.showTorrentManager()
                    }
                    Button {
                        Layout.fillWidth: true
                        text: "分卷管理"

                        onClicked: mainViewModel.showVolumeManager()
                    }
                }
            }

            // 搜索分组
            GroupBox {
                Layout.fillWidth: true
                title: "搜索"

                ColumnLayout {
                    anchors.fill: parent
                    spacing: 8

                    Button {
                        Layout.fillWidth: true
                        text: "产品搜索"

                        onClicked: mainViewModel.showProductSearch()
                    }
                    Button {
                        Layout.fillWidth: true
                        text: "作品搜索"

                        onClicked: mainViewModel.showWorkSearch()
                    }
                }
            }

            // 数据分组
            GroupBox {
                Layout.fillWidth: true
                title: "数据"

                ColumnLayout {
                    anchors.fill: parent
                    spacing: 8

                    Button {
                        Layout.fillWidth: true
                        text: "同步种子"

                        onClicked: mainViewModel.showSyncDialog()
                    }
                    Button {
                        Layout.fillWidth: true
                        text: "关联产品"

                        onClicked: mainViewModel.showLinkDialog()
                    }
                }
            }

            // 索引分组
            GroupBox {
                Layout.fillWidth: true
                title: "索引"

                ColumnLayout {
                    anchors.fill: parent
                    spacing: 8

                    Button {
                        Layout.fillWidth: true
                        text: "重建Bangumi"

                        onClicked: mainViewModel.showRebuildBangumiDialog()
                    }
                    Button {
                        Layout.fillWidth: true
                        text: "重建suruga-ya"

                        onClicked: mainViewModel.showRebuildSurugaDialog()
                    }
                }
            }
        }

        // 日志区域
        GroupBox {
            Layout.fillHeight: true
            Layout.fillWidth: true
            title: "日志"

            ListView {
                id: logListView

                anchors.fill: parent
                clip: true
                model: mainViewModel.logModel

                ScrollBar.vertical: ScrollBar {
                }
                delegate: Text {
                    text: model.display
                    wrapMode: Text.Wrap
                }

                // 自动滚动到底部
                onCountChanged: {
                    positionViewAtEnd();
                }
            }
        }
    }
}
