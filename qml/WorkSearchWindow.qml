import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick.Window

ApplicationWindow {
    id: root

    property var viewModel

    flags: Qt.Window
    height: 700
    minimumHeight: 500
    minimumWidth: 600
    title: "作品搜索"
    width: 900

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 12
        spacing: 8

        // 搜索栏
        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            TextField {
                id: searchField

                Layout.fillWidth: true
                placeholderText: "搜索作品..."

                onAccepted: {
                    if (root.viewModel)
                        root.viewModel.search(text);
                }
            }
            Button {
                text: "搜索"

                onClicked: {
                    if (root.viewModel)
                        root.viewModel.search(searchField.text);
                }
            }
        }

        // 结果列表
        TableView {
            id: tableView

            Layout.fillHeight: true
            Layout.fillWidth: true
            clip: true
            columnWidthProvider: function (column) {
                var widths = [200, 200, 60, 100];
                return widths[column] || 100;
            }
            model: root.viewModel ? root.viewModel.searchResultModel : null
            selectionBehavior: TableView.SelectRows
            selectionMode: TableView.SingleSelection

            delegate: Label {
                elide: Text.ElideRight
                implicitHeight: 30
                leftPadding: 4
                rightPadding: 4
                text: display
                verticalAlignment: Text.AlignVCenter
            }
        }

        // 底部按钮
        RowLayout {
            Layout.fillWidth: true

            Item {
                Layout.fillWidth: true
            }
            Button {
                text: "选择"

                onClicked: {
                    if (root.viewModel)
                        root.viewModel.selectCurrent();
                }
            }
            Button {
                text: "关闭"

                onClicked: root.close()
            }
        }
    }
}
