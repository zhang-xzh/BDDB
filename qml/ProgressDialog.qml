import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick.Window

ApplicationWindow {
    id: root
    title: qsTr("进度")
    width: 400
    height: 150
    minimumWidth: 300
    minimumHeight: 120
    maximumWidth: 600
    maximumHeight: 200
    flags: Qt.Dialog | Qt.WindowTitleHint | Qt.WindowCloseButtonHint
    modality: Qt.ApplicationModal

    property var viewModel

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 16
        spacing: 12

        // 状态标签
        Label {
            id: statusLabel
            text: root.viewModel ? root.viewModel.statusText : qsTr("准备中...")
            Layout.fillWidth: true
            elide: Text.ElideRight
        }

        // 进度条
        ProgressBar {
            id: progressBar
            Layout.fillWidth: true
            value: root.viewModel ? root.viewModel.progressValue : 0
            from: 0
            to: 100
        }

        // 取消按钮
        RowLayout {
            Layout.fillWidth: true

            Item {
                Layout.fillWidth: true
            }

            Button {
                text: qsTr("取消")
                onClicked: {
                    if (root.viewModel) root.viewModel.cancel()
                    root.close()
                }
            }
        }
    }

    Connections {
        target: root.viewModel
        function onFinished() {
            // 完成后自动关闭或保持显示结果
        }
    }
}
