#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <QMainWindow>
#include <QPointer>

class QListWidget;

class TorrentManagerWindow;
class VolumeManagerWindow;
class VolumeEditorWindow;
class MediaEditorWindow;
class WorkLinkWindow;
class ProductSearchWindow;
class WorkSearchWindow;
class ProgressDialog;

class MainWindow : public QMainWindow {
    Q_OBJECT

public:
    explicit MainWindow(QWidget *parent = nullptr);
    ~MainWindow() override;

signals:
    void syncProgressUpdated(int current, int total, QString message);
    void linkProgressUpdated(int current, int total, QString message);
    void bangumiRebuildProgressUpdated(int current, int total, QString message);
    void productRebuildProgressUpdated(int current, int total, QString message);

private:
    void setupUI();

    void showTorrentManager();
    void showVolumeManager();
    void showProductSearch();
    void showWorkSearch();

    void showSyncDialog();
    void showLinkDialog();
    void showRebuildBangumiDialog();
    void showRebuildSurugaDialog();

    void appendLog(const QString& message);

    QPointer<TorrentManagerWindow> m_torrentManagerWindow;
    QPointer<VolumeManagerWindow> m_volumeManagerWindow;
    QPointer<VolumeEditorWindow> m_volumeEditorWindow;
    QPointer<MediaEditorWindow> m_mediaEditorWindow;
    QPointer<WorkLinkWindow> m_workLinkWindow;
    QPointer<ProductSearchWindow> m_productSearchWindow;
    QPointer<WorkSearchWindow> m_workSearchWindow;

    // 独立的进度对话框
    QPointer<ProgressDialog> m_syncDialog;
    QPointer<ProgressDialog> m_linkDialog;
    QPointer<ProgressDialog> m_rebuildBangumiDialog;
    QPointer<ProgressDialog> m_rebuildSurugaDialog;

    // 日志显示区域
    QListWidget* m_logList = nullptr;
};

#endif // MAINWINDOW_H
