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
    title: "分卷管理"
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
                id: codeField

                Layout.fillWidth: true
                placeholderText: "编号..."

                onTextChanged: {
                    if (root.viewModel)
                        root.viewModel.setCodeFilter(text);
                }
            }
            TextField {
                id: titleField

                Layout.fillWidth: true
                placeholderText: "标题..."

                onTextChanged: {
                    if (root.viewModel)
                        root.viewModel.setTitleFilter(text);
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
            model: root.viewModel ? root.viewModel.volumeModel : null
            selectionBehavior: TableView.SelectRows
            selectionMode: TableView.ExtendedSelection

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
