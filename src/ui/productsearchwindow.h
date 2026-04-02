#ifndef PRODUCTSEARCHWINDOW_H
#define PRODUCTSEARCHWINDOW_H

#include <QMainWindow>
#include <QPointer>

class ProgressDialog;

class ProductSearchWindow : public QMainWindow {
    Q_OBJECT

public:
    explicit ProductSearchWindow(QWidget *parent = nullptr);
    ~ProductSearchWindow() override;

private:
    void setupUI();
    void showRebuildSurugaDialog();

    QPointer<ProgressDialog> m_dialog;
};

#endif // PRODUCTSEARCHWINDOW_H
