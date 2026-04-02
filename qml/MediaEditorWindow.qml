import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick.Window

ApplicationWindow {
    id: root
    title: qsTr("媒体编辑")
    width: 600
    height: 500
    minimumWidth: 400
    minimumHeight: 300
    flags: Qt.Window

    property var viewModel

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 12
        spacing: 8

        Label {
            text: qsTr("媒体编辑窗口")
        }
    }
}
