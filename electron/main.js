const { app, BrowserWindow, screen, Menu } = require('electron')
const path = require('path')

// 字体渲染优化配置
app.commandLine.appendSwitch('disable-features', 'LCDTextAntialiasing')

let mainWindow

function createWindow() {
    // 获取主显示器信息和缩放因子
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.workAreaSize
    const scaleFactor = primaryDisplay.scaleFactor
    
    console.log('Display:', width, 'x', height, 'Scale:', scaleFactor)
    
    // 窗口尺寸 - 在高分屏上自动适配
    const windowWidth = Math.min(1400, Math.floor(width * 0.85))
    const windowHeight = Math.min(900, Math.floor(height * 0.85))
    
    mainWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        minWidth: 1000,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            defaultFontFamily: {
                standard: 'Maple Mono NF CN',
                serif: 'Maple Mono NF CN',
                sansSerif: 'Maple Mono NF CN',
                monospace: 'Maple Mono NF CN'
            },
            defaultFontSize: 12,
            defaultMonospaceFontSize: 12
        },
        titleBarStyle: 'default',
        show: false
    })

    // 关键：保持系统DPI缩放，但禁止网页内缩放
    // Electron 会自动处理 scaleFactor，不需要强制设置
    
    // 禁止 Ctrl+滚轮和 Ctrl++/Ctrl+- 缩放
    mainWindow.webContents.setZoomFactor(1)
    mainWindow.webContents.on('zoom-changed', () => {
        mainWindow.webContents.setZoomFactor(1)
    })

    // 加载应用
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:3000')
        mainWindow.webContents.openDevTools()
    } else {
        mainWindow.loadFile(path.join(__dirname, '../out/index.html'))
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show()
        // 标记 Electron 环境并记录缩放
        mainWindow.webContents.executeJavaScript(`
            document.body.classList.add('electron');
            document.documentElement.style.setProperty('--scale-factor', '${scaleFactor}');
        `).catch(() => {})
    })

    // 移除菜单栏
    Menu.setApplicationMenu(null)
    
    mainWindow.on('closed', () => {
        mainWindow = null
    })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow()
    }
})
