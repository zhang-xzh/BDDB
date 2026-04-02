#ifndef PROGRESSDIALOG_H
#define PROGRESSDIALOG_H

#include <QDialog>
#include <QFuture>
#include <QFutureWatcher>
#include <QEventLoop>
#include <functional>
#include <atomic>
#include <thread>

class QProgressBar;
class QLabel;
class QPushButton;

class ProgressDialog : public QDialog {
    Q_OBJECT

public:
    using TaskFunc = std::function<void(ProgressDialog *dialog)>;

    explicit ProgressDialog(const QString &title, QWidget *parent = nullptr);
    ~ProgressDialog();

    void setTask(TaskFunc task);
    void setStatus(const QString &text);
    void setProgress(int value);
    bool isCancelled() const;

    void run();

    template<typename T>
    void execTask(QFuture<T> future) {
        QFutureWatcher<T> watcher;
        QEventLoop loop;

        connect(&watcher, &QFutureWatcher<T>::progressValueChanged, 
                this, &ProgressDialog::setProgress);
        connect(&watcher, &QFutureWatcher<T>::finished, 
                this, [this, &watcher]() {
            if (!isCancelled()) {
                setProgress(100);
            }
            this->accept();
        });
        connect(this, &ProgressDialog::cancelled, &watcher, &QFutureWatcher<T>::cancel);

        watcher.setFuture(future);
        exec();
    }

signals:
    void taskFinished();
    void cancelled();

private:
    void setupUI();
    void closeEvent(QCloseEvent *event) override;

    QProgressBar *m_progressBar = nullptr;
    QLabel *m_statusLabel = nullptr;
    QPushButton *m_cancelBtn = nullptr;
    TaskFunc m_task;
    std::thread m_thread;
    std::atomic<bool> m_cancelled{false};
};

#endif // PROGRESSDIALOG_H
