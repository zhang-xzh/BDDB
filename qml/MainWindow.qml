import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick.Window

ApplicationWindow {
    id: root
    title: "BDDB"
    visible: true
    width: 700
    height: 500
    minimumWidth: 700
    minimumHeight: 500
    maximumWidth: 700
    maximumHeight: 500
    flags: Qt.Window | Qt.WindowTitleHint | Qt.WindowSystemMenuHint | Qt.WindowMinimizeButtonHint | Qt.WindowCloseButtonHint

    // 禁用最大化按钮
    onVisibilityChanged: {
        if (visibility === Window.Maximized) {
            visibility = Window.Windowed
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
                title: qsTr("管理")
                Layout.fillWidth: true

                ColumnLayout {
                    anchors.fill: parent
                    spacing: 8

                    Button {
                        text: qsTr("种子管理")
                        Layout.fillWidth: true
                        onClicked: mainViewModel.showTorrentManager()
                    }

                    Button {
                        text: qsTr("分卷管理")
                        Layout.fillWidth: true
                        onClicked: mainViewModel.showVolumeManager()
                    }
                }
            }

            // 搜索分组
            GroupBox {
                title: qsTr("搜索")
                Layout.fillWidth: true

                ColumnLayout {
                    anchors.fill: parent
                    spacing: 8

                    Button {
                        text: qsTr("产品搜索")
                        Layout.fillWidth: true
                        onClicked: mainViewModel.showProductSearch()
                    }

                    Button {
                        text: qsTr("作品搜索")
                        Layout.fillWidth: true
                        onClicked: mainViewModel.showWorkSearch()
                    }
                }
            }

            // 数据分组
            GroupBox {
                title: qsTr("数据")
                Layout.fillWidth: true

                ColumnLayout {
                    anchors.fill: parent
                    spacing: 8

                    Button {
                        text: qsTr("同步种子")
                        Layout.fillWidth: true
                        onClicked: mainViewModel.showSyncDialog()
                    }

                    Button {
                        text: qsTr("关联产品")
                        Layout.fillWidth: true
                        onClicked: mainViewModel.showLinkDialog()
                    }
                }
            }

            // 索引分组
            GroupBox {
                title: qsTr("索引")
                Layout.fillWidth: true

                ColumnLayout {
                    anchors.fill: parent
                    spacing: 8

                    Button {
                        text: qsTr("重建Bangumi")
                        Layout.fillWidth: true
                        onClicked: mainViewModel.showRebuildBangumiDialog()
                    }

                    Button {
                        text: qsTr("重建suruga-ya")
                        Layout.fillWidth: true
                        onClicked: mainViewModel.showRebuildSurugaDialog()
                    }
                }
            }
        }

        // 日志区域
        GroupBox {
            title: qsTr("日志")
            Layout.fillWidth: true
            Layout.fillHeight: true

            ListView {
                id: logListView
                anchors.fill: parent
                clip: true
                model: mainViewModel.logModel

                ScrollBar.vertical: ScrollBar {}

                delegate: Text {
                    text: model.display
                    wrapMode: Text.Wrap
                }

                // 自动滚动到底部
                onCountChanged: {
                    positionViewAtEnd()
                }
            }
        }
    }
}
