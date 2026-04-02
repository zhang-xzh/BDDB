#ifndef WORKSEARCHWINDOW_H
#define WORKSEARCHWINDOW_H

#include <QMainWindow>
#include <QPointer>

class ProgressDialog;

class WorkSearchWindow : public QMainWindow {
    Q_OBJECT

public:
    explicit WorkSearchWindow(QWidget *parent = nullptr);
    ~WorkSearchWindow() override;

private:
    void setupUI();
    void showRebuildBangumiDialog();

    QPointer<ProgressDialog> m_dialog;
};

#endif // WORKSEARCHWINDOW_H
