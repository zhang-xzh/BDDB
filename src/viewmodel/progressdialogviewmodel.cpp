#include "viewmodel/progressdialogviewmodel.h"

#include <QQmlComponent>
#include <QQmlContext>
#include <QDebug>

ProgressDialogViewModel::ProgressDialogViewModel(const QString &title, QObject *parent)
    : QObject(parent)
      , m_title(title)
      , m_engine(new QQmlApplicationEngine(this)) {
}

ProgressDialogViewModel::~ProgressDialogViewModel() {
    if (m_window) {
        delete m_window;
    }
}

QString ProgressDialogViewModel::statusText() const {
    return m_statusText;
}

int ProgressDialogViewModel::progressValue() const {
    return m_progressValue;
}

void ProgressDialogViewModel::show() {
    if (!m_window) {
        m_engine->rootContext()->setContextProperty("viewModel", this);
        m_engine->rootContext()->setContextProperty("progressViewModel", this);

        QQmlComponent component(m_engine, QUrl(QStringLiteral("qrc:/qt/qml/BDDB/qml/ProgressDialog.qml")));
        if (component.status() != QQmlComponent::Ready) {
            qWarning() << "Failed to load ProgressDialog.qml:" << component.errorString();
            return;
        }

        m_window = component.create();
        if (!m_window) {
            qWarning() << "Failed to create window:" << component.errorString();
            return;
        }

        // 设置窗口标题
        m_window->setProperty("title", m_title);

        connect(m_window, SIGNAL(destroyed()), this, SLOT(deleteLater()));
    }

    QMetaObject::invokeMethod(m_window, "show");
    QMetaObject::invokeMethod(m_window, "raise");
}

void ProgressDialogViewModel::setStatus(const QString &text) {
    if (m_statusText != text) {
        m_statusText = text;
        emit statusTextChanged();
    }
}

void ProgressDialogViewModel::setProgress(int value) {
    if (m_progressValue != value) {
        m_progressValue = value;
        emit progressValueChanged();
    }
}

bool ProgressDialogViewModel::cancelling() const {
    return m_cancelling;
}

void ProgressDialogViewModel::cancel() {
    m_cancelled.store(true);
    m_cancelling = true;
    emit cancellingChanged();
    setStatus(m_statusText + " (正在取消...)");
}
