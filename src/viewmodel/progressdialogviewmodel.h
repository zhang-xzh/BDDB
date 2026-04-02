#ifndef PROGRESSDIALOGVIEWMODEL_H
#define PROGRESSDIALOGVIEWMODEL_H

#include <QObject>
#include <QPointer>
#include <QQmlApplicationEngine>
#include <atomic>

class ProgressDialogViewModel : public QObject {
    Q_OBJECT
    Q_PROPERTY(QString statusText READ statusText NOTIFY statusTextChanged)
    Q_PROPERTY(int progressValue READ progressValue NOTIFY progressValueChanged)
    Q_PROPERTY(bool cancelling READ cancelling NOTIFY cancellingChanged)

public:
    explicit ProgressDialogViewModel(const QString &title, QObject *parent = nullptr);

    ~ProgressDialogViewModel() override;

    QString statusText() const;

    int progressValue() const;

    bool cancelling() const;

    Q_INVOKABLE void show();

    Q_INVOKABLE void setStatus(const QString &text);

    Q_INVOKABLE void setProgress(int value);

    Q_INVOKABLE void cancel();

    // 取消标志，Worker 会检查这个标志
    std::atomic<bool> m_cancelled{false};

signals:
    void statusTextChanged();

    void progressValueChanged();

    void cancellingChanged();

    void finished();

private:
    QString m_title;
    QString m_statusText;
    int m_progressValue = 0;
    bool m_cancelling = false;
    QObject *m_window = nullptr;
    QQmlApplicationEngine *m_engine = nullptr;
};

#endif // PROGRESSDIALOGVIEWMODEL_H
