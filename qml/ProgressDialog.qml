import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick.Window

ApplicationWindow {
    id: root

    property var viewModel

    flags: Qt.Dialog | Qt.WindowTitleHint
    height: 150
    maximumHeight: 200
    maximumWidth: 600
    minimumHeight: 120
    minimumWidth: 300
    modality: Qt.ApplicationModal
    title: "进度"
    width: 400

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 16
        spacing: 12

        // 状态标签
        Label {
            id: statusLabel

            Layout.fillWidth: true
            elide: Text.ElideRight
            text: root.viewModel ? root.viewModel.statusText : "准备中..."
        }

        // 进度条
        ProgressBar {
            id: progressBar

            Layout.fillWidth: true
            from: 0
            to: 100
            value: root.viewModel ? root.viewModel.progressValue : 0
        }

        // 取消按钮
        RowLayout {
            Layout.fillWidth: true

            Item {
                Layout.fillWidth: true
            }
            Button {
                id: cancelButton

                enabled: root.viewModel ? !root.viewModel.cancelling : true
                text: root.viewModel && root.viewModel.cancelling ? "正在取消..." : "取消"

                onClicked: {
                    if (root.viewModel)
                        root.viewModel.cancel();
                    // 不立即关闭窗口，等待操作完成
                }
            }
        }
    }
    Connections {
        function onFinished() {
            // 操作完成后关闭窗口
            root.close();
        }

        target: root.viewModel
    }
}
