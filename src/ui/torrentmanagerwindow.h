#ifndef TORRENTMANAGERWINDOW_H
#define TORRENTMANAGERWINDOW_H

#include <QMainWindow>
#include <memory>

class TorrentModel;
class QTableView;
class QLineEdit;

class TorrentManagerWindow : public QMainWindow {
    Q_OBJECT

public:
    explicit TorrentManagerWindow(QWidget *parent = nullptr);
    ~TorrentManagerWindow() override;

private:
    void setupUI();
    void loadData();

    void onSearchTextChanged(const QString &text);

    TorrentModel *m_model = nullptr;
    QTableView *m_tableView = nullptr;
    QLineEdit *m_searchEdit = nullptr;
};

#endif // TORRENTMANAGERWINDOW_H
