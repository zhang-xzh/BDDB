import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick.Window

ApplicationWindow {
    id: root
    title: qsTr("种子管理")
    width: 600
    height: 900
    minimumWidth: 500
    minimumHeight: 600
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
                placeholderText: qsTr("搜索...")
                Layout.fillWidth: true
                onTextChanged: root.viewModel?.setSearchText(text)
            }
        }

        // 列表
        TableView {
            id: tableView
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true

            model: root.viewModel?.torrentModel

            selectionBehavior: TableView.SelectRows
            selectionMode: TableView.SingleSelection

            columnWidthProvider: function(column) {
                return root.width / 4
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
    }

    Component.onCompleted: {
        root.viewModel?.loadData()
    }
}
