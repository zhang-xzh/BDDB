import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick.Window

ApplicationWindow {
    id: root
    title: "产品搜索"
    width: 900
    height: 700
    minimumWidth: 600
    minimumHeight: 500
    flags: Qt.Window

    property var viewModel

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
                placeholderText: "搜索产品..."
                Layout.fillWidth: true
                onAccepted: root.viewModel?.search(text)
            }

            Button {
                text: "搜索"
                onClicked: root.viewModel?.search(searchField.text)
            }
        }

        // 结果列表
        TableView {
            id: tableView
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true

            model: root.viewModel?.searchResultModel

            selectionBehavior: TableView.SelectRows
            selectionMode: TableView.SingleSelection

            columnWidthProvider: function(column) {
                var widths = [100, 400, 80, 200]
                return widths[column] || 100
            }

            delegate: Label {
                implicitHeight: 30
                text: display
                verticalAlignment: Text.AlignVCenter
                elide: Text.ElideRight
                leftPadding: 4
                rightPadding: 4
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
                onClicked: root.viewModel?.selectCurrent()
            }

            Button {
                text: "关闭"
                onClicked: root.close()
            }
        }
    }
}
