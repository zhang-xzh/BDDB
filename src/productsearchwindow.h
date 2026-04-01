#ifndef PRODUCTSEARCHWINDOW_H
#define PRODUCTSEARCHWINDOW_H

#include <QMainWindow>

class ProductSearchWindow : public QMainWindow {
    Q_OBJECT

public:
    explicit ProductSearchWindow(QWidget *parent = nullptr);
    ~ProductSearchWindow() override;

private:
    void setupUI();
};

#endif // PRODUCTSEARCHWINDOW_H
