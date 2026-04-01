#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <QMainWindow>
#include <QPointer>

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

private:
    void setupUI();

    void showTorrentManager();
    void showVolumeManager();
    void showProductSearch();
    void showWorkSearch();
    void showSyncDialog();
    void showLinkDialog();

    QPointer<TorrentManagerWindow> m_torrentManagerWindow;
    QPointer<VolumeManagerWindow> m_volumeManagerWindow;
    QPointer<VolumeEditorWindow> m_volumeEditorWindow;
    QPointer<MediaEditorWindow> m_mediaEditorWindow;
    QPointer<WorkLinkWindow> m_workLinkWindow;
    QPointer<ProductSearchWindow> m_productSearchWindow;
    QPointer<WorkSearchWindow> m_workSearchWindow;
    QPointer<ProgressDialog> m_syncDialog;
    QPointer<ProgressDialog> m_linkDialog;
};

#endif // MAINWINDOW_H
