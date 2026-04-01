#ifndef PROGRESSDIALOG_H
#define PROGRESSDIALOG_H

#include <QDialog>

class QProgressBar;
class QLabel;

class ProgressDialog : public QDialog {
    Q_OBJECT

public:
    explicit ProgressDialog(const QString &title, QWidget *parent = nullptr);

    void setStatus(const QString &text);
    void setProgress(int value);

private:
    void setupUI();

    QProgressBar *m_progressBar = nullptr;
    QLabel *m_statusLabel = nullptr;
};

#endif // PROGRESSDIALOG_H
