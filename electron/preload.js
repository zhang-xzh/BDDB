const { contextBridge } = require('electron')

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform,
    versions: process.versions,
    // 标记为 Electron 环境
    isElectron: true
})
