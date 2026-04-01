#include <QApplication>
#include "core/mainwindow.h"

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);
    QApplication::setApplicationName("BDDB");
    QApplication::setOrganizationName("BDDB");

    MainWindow window;
    window.show();

    return QApplication::exec();
}
