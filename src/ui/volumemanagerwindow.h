#ifndef VOLUMEMANAGERWINDOW_H
#define VOLUMEMANAGERWINDOW_H

#include <QMainWindow>

class VolumeModel;
class QTableView;
class QLineEdit;

class VolumeManagerWindow : public QMainWindow {
    Q_OBJECT

public:
    explicit VolumeManagerWindow(QWidget *parent = nullptr);
    ~VolumeManagerWindow() override;

private:
    void setupUI();
    void loadData();

    VolumeModel *m_model = nullptr;
    QTableView *m_tableView = nullptr;
    QLineEdit *m_codeEdit = nullptr;
    QLineEdit *m_titleEdit = nullptr;
};

#endif // VOLUMEMANAGERWINDOW_H
