const { app, BrowserWindow, screen, Menu } = require('electron')
const path = require('path')
const { startServer, stopServer } = require('./server')

// 字体渲染优化配置
app.commandLine.appendSwitch('disable-features', 'LCDTextAntialiasing')

let mainWindow
let serverUrl = null

async function createWindow() {
    // 先启动后端服务
    try {
        serverUrl = await startServer()
        console.log('Server ready at:', serverUrl)
    } catch (err) {
        console.error('Failed to start server:', err)
    }

    // 获取显示器信息
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.workAreaSize
    const scaleFactor = primaryDisplay.scaleFactor
    
    console.log('Display:', width, 'x', height, 'Scale:', scaleFactor)
    
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

    // 禁止缩放
    mainWindow.webContents.setZoomFactor(1)
    mainWindow.webContents.on('zoom-changed', () => {
        mainWindow.webContents.setZoomFactor(1)
    })

    // 加载应用
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:3000')
        mainWindow.webContents.openDevTools()
    } else {
        // 生产环境加载本地服务
        if (serverUrl) {
            mainWindow.loadURL(serverUrl)
        } else {
            // 备用：加载静态文件
            mainWindow.loadFile(path.join(__dirname, '../out/index.html'))
        }
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show()
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
    stopServer()
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow()
    }
})

app.on('before-quit', () => {
    stopServer()
})
