#ifndef PROGRESSDIALOG_H
#define PROGRESSDIALOG_H

#include <QDialog>

class QProgressBar;
class QLabel;
class QPushButton;

class ProgressDialog : public QDialog {
    Q_OBJECT

public:
    explicit ProgressDialog(const QString &title, QWidget *parent = nullptr);

    void setStatus(const QString &text);
    void setProgress(qint32 value);

    // 检查是否已取消
    bool isCancelled() const { return m_cancelled; }

signals:
    void cancelled();

private:
    void setupUI();
    void onCancelClicked();

    QProgressBar *m_progressBar = nullptr;
    QLabel *m_statusLabel = nullptr;
    QPushButton *m_cancelBtn = nullptr;
    bool m_cancelled = false;
};

#endif // PROGRESSDIALOG_H
