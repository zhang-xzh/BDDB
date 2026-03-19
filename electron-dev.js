const { spawn } = require('child_process')
const path = require('path')

// 启动 Next.js dev server
const nextDev = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true
})

// 等待服务器启动后启动 Electron
setTimeout(() => {
    const electron = spawn('npx', ['electron', 'electron/main.js'], {
        stdio: 'inherit',
        shell: true,
        env: {
            ...process.env,
            NODE_ENV: 'development'
        }
    })

    electron.on('close', () => {
        nextDev.kill()
        process.exit()
    })
}, 5000)

process.on('SIGINT', () => {
    nextDev.kill()
    process.exit()
})
