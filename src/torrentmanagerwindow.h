#ifndef TORRENTMANAGERWINDOW_H
#define TORRENTMANAGERWINDOW_H

#include <QMainWindow>

class TorrentManagerWindow : public QMainWindow {
    Q_OBJECT

public:
    explicit TorrentManagerWindow(QWidget *parent = nullptr);
    ~TorrentManagerWindow() override;

private:
    void setupUI();
};

#endif // TORRENTMANAGERWINDOW_H
