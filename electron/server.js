const { spawn } = require('child_process')
const path = require('path')
const net = require('net')
const fs = require('fs')

const isDev = process.env.NODE_ENV === 'development'
const serverDir = isDev ? path.join(__dirname, '..') : path.join(process.resourcesPath, 'server')
const userDataDir = isDev ? path.join(__dirname, '..') : path.join(process.env.APPDATA || process.env.HOME, 'BDDB')
const port = process.env.PORT || 3000

let serverProcess = null

// 读取配置文件
function loadConfig() {
    const configPaths = [
        // 用户数据目录（最高优先级）
        path.join(userDataDir, 'config.json'),
        // 安装目录
        path.join(serverDir, 'config.json'),
        // 默认模板
        path.join(__dirname, 'config-template.json'),
    ]
    
    for (const configPath of configPaths) {
        if (fs.existsSync(configPath)) {
            try {
                console.log('Loading config from:', configPath)
                return JSON.parse(fs.readFileSync(configPath, 'utf8'))
            } catch (e) {
                console.error('Failed to load config from', configPath, e.message)
            }
        }
    }
    
    // 默认配置
    return {
        database: { host: 'localhost', port: 27017, prodDb: 'bddb_prod', devDb: 'bddb_dev' },
        meilisearch: { host: 'localhost', port: 7700 },
        qbittorrent: { host: 'localhost:18000', username: 'admin', password: 'password' },
        env: 'production'
    }
}

// 保存配置到用户目录（首次运行时复制）
function initUserConfig() {
    const userConfigPath = path.join(userDataDir, 'config.json')
    
    // 确保用户数据目录存在
    if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true })
    }
    
    // 如果用户目录没有配置文件，从安装目录复制
    if (!fs.existsSync(userConfigPath)) {
        const installConfigPath = path.join(serverDir, 'config.json')
        if (fs.existsSync(installConfigPath)) {
            fs.copyFileSync(installConfigPath, userConfigPath)
            console.log('Copied config to user directory:', userConfigPath)
        }
    }
    
    return userConfigPath
}

// 检查端口是否被占用
function checkPort(port) {
    return new Promise((resolve) => {
        const server = net.createServer()
        server.once('error', () => resolve(false))
        server.once('listening', () => {
            server.close()
            resolve(true)
        })
        server.listen(port)
    })
}

// 启动 Next.js 服务
async function startServer() {
    const isPortFree = await checkPort(port)
    if (!isPortFree) {
        console.log(`Port ${port} is already in use, assuming server is running`)
        return `http://localhost:${port}`
    }

    // 初始化用户配置
    initUserConfig()
    
    // 加载配置
    const config = loadConfig()
    console.log('Using config:', JSON.stringify(config, null, 2))

    return new Promise((resolve, reject) => {
        console.log('Starting Next.js server...')
        
        // 生产环境使用打包后的 standalone 模式
        const serverPath = isDev 
            ? path.join(serverDir, 'node_modules', '.bin', 'next')
            : path.join(serverDir, 'server.js')
        
        const args = isDev ? ['start', '-p', port] : ['-p', port]
        
        // 构建环境变量
        const env = {
            ...process.env,
            NODE_ENV: config.env || 'production',
            PORT: port,
            // 数据库配置
            MONGO_HOST: config.database?.host || 'localhost',
            MONGO_PORT: String(config.database?.port || 27017),
            MONGO_DB_PROD: config.database?.prodDb || 'bddb_prod',
            MONGO_DB_DEV: config.database?.devDb || 'bddb_dev',
            MONGO_DB_TEST: config.database?.testDb || 'bddb_test',
            // Meilisearch 配置
            MEILI_HOST: config.meilisearch?.host || 'localhost',
            MEILI_PORT: String(config.meilisearch?.port || 7700),
            MEILI_API_KEY: config.meilisearch?.apiKey || '',
            // qBittorrent 配置
            QB_HOST: config.qbittorrent?.host || 'localhost:18000',
            QB_USER: config.qbittorrent?.username || 'admin',
            QB_PASS: config.qbittorrent?.password || 'password',
        }

        serverProcess = spawn('node', [serverPath, ...args], {
            cwd: serverDir,
            env,
            stdio: 'pipe'
        })

        serverProcess.stdout.on('data', (data) => {
            const output = data.toString()
            console.log('[Server]', output)
            
            if (output.includes('Ready') || output.includes('3000')) {
                setTimeout(() => {
                    resolve(`http://localhost:${port}`)
                }, 1000)
            }
        })

        serverProcess.stderr.on('data', (data) => {
            console.error('[Server Error]', data.toString())
        })

        serverProcess.on('error', (err) => {
            reject(err)
        })

        serverProcess.on('exit', (code) => {
            console.log(`Server exited with code ${code}`)
            serverProcess = null
        })

        setTimeout(() => {
            if (serverProcess) {
                resolve(`http://localhost:${port}`)
            }
        }, 10000)
    })
}

// 停止服务
function stopServer() {
    if (serverProcess) {
        console.log('Stopping server...')
        
        if (process.platform === 'win32') {
            spawn('taskkill', ['/pid', serverProcess.pid, '/f', '/t'])
        } else {
            serverProcess.kill('SIGTERM')
        }
        
        serverProcess = null
    }
}

// 获取配置（供其他模块使用）
function getConfig() {
    return loadConfig()
}

module.exports = { startServer, stopServer, getConfig, initUserConfig }
