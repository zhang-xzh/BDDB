#ifndef MEDIAEDITORWINDOW_H
#define MEDIAEDITORWINDOW_H

#include <QMainWindow>

class MediaEditorWindow : public QMainWindow {
    Q_OBJECT

public:
    explicit MediaEditorWindow(QWidget *parent = nullptr);
    ~MediaEditorWindow() override;

private:
    void setupUI();
};

#endif // MEDIAEDITORWINDOW_H
