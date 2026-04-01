#ifndef WORKLINKWINDOW_H
#define WORKLINKWINDOW_H

#include <QMainWindow>

class WorkLinkWindow : public QMainWindow {
    Q_OBJECT

public:
    explicit WorkLinkWindow(QWidget *parent = nullptr);
    ~WorkLinkWindow() override;

private:
    void setupUI();
};

#endif // WORKLINKWINDOW_H
