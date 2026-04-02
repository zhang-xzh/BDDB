#ifndef WORKSEARCHWINDOW_H
#define WORKSEARCHWINDOW_H

#include <QMainWindow>
#include <QPointer>
#include <QFutureWatcher>

class ProgressDialog;
struct BangumiSyncResult;

class WorkSearchWindow : public QMainWindow {
    Q_OBJECT

public:
    explicit WorkSearchWindow(QWidget *parent = nullptr);
    ~WorkSearchWindow() override;

private:
    void setupUI();
    void showRebuildBangumiDialog();
    void closeProgressDialog();

    QPointer<ProgressDialog> m_dialog;
    QPointer<QFutureWatcher<BangumiSyncResult>> m_watcher;
};

#endif // WORKSEARCHWINDOW_H
