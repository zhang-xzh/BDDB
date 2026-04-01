#ifndef VOLUMEEDITORWINDOW_H
#define VOLUMEEDITORWINDOW_H

#include <QMainWindow>

class VolumeEditorWindow : public QMainWindow {
    Q_OBJECT

public:
    explicit VolumeEditorWindow(QWidget *parent = nullptr);
    ~VolumeEditorWindow() override;

private:
    void setupUI();
};

#endif // VOLUMEEDITORWINDOW_H
