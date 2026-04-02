#ifndef PROGRESSDIALOGVIEWMODEL_H
#define PROGRESSDIALOGVIEWMODEL_H

#include <QObject>
#include <QPointer>
#include <QQmlApplicationEngine>

class ProgressDialogViewModel : public QObject {
    Q_OBJECT
    Q_PROPERTY(QString statusText READ statusText NOTIFY statusTextChanged)
    Q_PROPERTY(int progressValue READ progressValue NOTIFY progressValueChanged)

public:
    explicit ProgressDialogViewModel(const QString &title, QObject *parent = nullptr);

    ~ProgressDialogViewModel() override;

    QString statusText() const;

    int progressValue() const;

    Q_INVOKABLE void show();

    Q_INVOKABLE void setStatus(const QString &text);

    Q_INVOKABLE void setProgress(int value);

    Q_INVOKABLE void cancel();

signals:
    void statusTextChanged();

    void progressValueChanged();

    void finished();

private:
    QString m_title;
    QString m_statusText;
    int m_progressValue = 0;
    QObject *m_window = nullptr;
    QQmlApplicationEngine *m_engine = nullptr;
};

#endif // PROGRESSDIALOGVIEWMODEL_H
