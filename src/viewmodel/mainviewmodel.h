#ifndef MAINVIEWMODEL_H
#define MAINVIEWMODEL_H

#include <QObject>
#include <QPointer>
#include <QStringListModel>

// 前向声明
class TorrentManagerViewModel;
class VolumeManagerViewModel;
class ProductSearchViewModel;
class WorkSearchViewModel;
class ProgressDialogViewModel;

class MainViewModel : public QObject {
    Q_OBJECT
    Q_PROPERTY(QStringListModel* logModel READ logModel CONSTANT)

public:
    explicit MainViewModel(QObject *parent = nullptr);

    ~MainViewModel() override;

    [[nodiscard]] QStringListModel *logModel() const;

    Q_INVOKABLE void showTorrentManager();

    Q_INVOKABLE void showVolumeManager();

    Q_INVOKABLE void showProductSearch();

    Q_INVOKABLE void showWorkSearch();

    Q_INVOKABLE void showSyncDialog();

    Q_INVOKABLE void showLinkDialog();

    Q_INVOKABLE void showRebuildBangumiDialog();

    Q_INVOKABLE void showRebuildSurugaDialog();

    Q_INVOKABLE void appendLog(const QString &message);

private:
    QStringListModel *m_logModel = nullptr;

    // 子窗口
    QPointer<TorrentManagerViewModel> m_torrentManagerVM;
    QPointer<VolumeManagerViewModel> m_volumeManagerVM;
    QPointer<ProductSearchViewModel> m_productSearchVM;
    QPointer<WorkSearchViewModel> m_workSearchVM;

    // 进度对话框
    QPointer<ProgressDialogViewModel> m_syncDialogVM;
    QPointer<ProgressDialogViewModel> m_linkDialogVM;
    QPointer<ProgressDialogViewModel> m_rebuildBangumiVM;
    QPointer<ProgressDialogViewModel> m_rebuildSurugaVM;
};

#endif // MAINVIEWMODEL_H
