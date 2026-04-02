import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick.Window

ApplicationWindow {
    id: root

    property var viewModel

    flags: Qt.Window
    height: 900
    minimumHeight: 600
    minimumWidth: 500
    title: "种子管理"
    width: 600

    Component.onCompleted: {
        if (root.viewModel)
            root.viewModel.loadData();
    }

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
                placeholderText: "搜索..."

                onTextChanged: {
                    if (root.viewModel)
                        root.viewModel.setSearchText(text);
                }
            }
        }

        // 列表
        TableView {
            id: tableView

            Layout.fillHeight: true
            Layout.fillWidth: true
            clip: true
            columnWidthProvider: function (column) {
                return root.width / 4;
            }
            model: root.viewModel ? root.viewModel.torrentModel : null
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
    }
}
