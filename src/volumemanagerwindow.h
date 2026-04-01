#ifndef VOLUMEMANAGERWINDOW_H
#define VOLUMEMANAGERWINDOW_H

#include <QMainWindow>

class VolumeManagerWindow : public QMainWindow {
    Q_OBJECT

public:
    explicit VolumeManagerWindow(QWidget *parent = nullptr);
    ~VolumeManagerWindow() override;

private:
    void setupUI();
};

#endif // VOLUMEMANAGERWINDOW_H
