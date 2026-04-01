#ifndef WORKSEARCHWINDOW_H
#define WORKSEARCHWINDOW_H

#include <QMainWindow>

class WorkSearchWindow : public QMainWindow {
    Q_OBJECT

public:
    explicit WorkSearchWindow(QWidget *parent = nullptr);
    ~WorkSearchWindow() override;

private:
    void setupUI();
};

#endif // WORKSEARCHWINDOW_H
