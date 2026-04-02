#include <QApplication>
#include <QFont>
#include <QFontDatabase>
#include "core/mainwindow.h"

int main(int argc, char *argv[]) {
    // Windows 高 DPI 支持 - 必须在 QApplication 之前设置
#ifdef Q_OS_WIN
    qputenv("QT_SCALE_FACTOR_ROUNDING_POLICY", "PassThrough");
#endif

    QApplication app(argc, argv);

    QApplication::setApplicationName("BDDB");
    QApplication::setOrganizationName("BDDB");

    // 全局抗锯齿字体 - 使用系统默认字体但强制抗锯齿
    QFont font = QFontDatabase::systemFont(QFontDatabase::GeneralFont);
    font.setStyleStrategy(QFont::PreferAntialias);
    QApplication::setFont(font);

    MainWindow window;
    window.show();

    return QApplication::exec();
}
