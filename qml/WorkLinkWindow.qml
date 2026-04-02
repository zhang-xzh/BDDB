import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick.Window

ApplicationWindow {
    id: root

    property var viewModel

    flags: Qt.Window
    height: 500
    minimumHeight: 300
    minimumWidth: 400
    title: "作品关联"
    width: 600

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 12
        spacing: 8

        Label {
            text: "作品关联窗口"
        }
    }
}
