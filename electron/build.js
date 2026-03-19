const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const rootDir = path.join(__dirname, '..')
const nextDir = path.join(rootDir, '.next')
const distDir = path.join(rootDir, 'dist')

// 清理之前的构建文件
console.log('Cleaning previous build...')
if (fs.existsSync(nextDir)) {
    fs.rmSync(nextDir, { recursive: true, force: true })
}
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true })
}

// 构建 Next.js（standalone 模式）
console.log('Building Next.js...')
execSync('npm run build', { 
    cwd: rootDir, 
    stdio: 'inherit'
})

// 生成配置文件到构建目录
console.log('Generating config file...')
const configTemplate = JSON.parse(fs.readFileSync(path.join(__dirname, 'config-template.json'), 'utf8'))
const configOutputPath = path.join(nextDir, 'standalone', 'config.json')

// 如果有本地 .env 配置，合并进去
try {
    const envContent = fs.readFileSync(path.join(rootDir, '.env.local'), 'utf8')
    const envVars = {}
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([A-Z_]+)=(.+)$/)
        if (match) {
            envVars[match[1]] = match[2].replace(/^"|"$/g, '')
        }
    })
    
    // 合并环境变量到配置
    if (envVars.MONGO_HOST) configTemplate.database.host = envVars.MONGO_HOST
    if (envVars.MONGO_PORT) configTemplate.database.port = parseInt(envVars.MONGO_PORT)
    if (envVars.MONGO_DB_PROD) configTemplate.database.prodDb = envVars.MONGO_DB_PROD
    if (envVars.QB_HOST) configTemplate.qbittorrent.host = envVars.QB_HOST
    if (envVars.QB_USER) configTemplate.qbittorrent.username = envVars.QB_USER
    if (envVars.QB_PASS) configTemplate.qbittorrent.password = envVars.QB_PASS
} catch (e) {
    console.log('No .env.local found, using defaults')
}

// 确保 standalone 目录存在
if (!fs.existsSync(path.dirname(configOutputPath))) {
    fs.mkdirSync(path.dirname(configOutputPath), { recursive: true })
}

fs.writeFileSync(configOutputPath, JSON.stringify(configTemplate, null, 2))
console.log('Config file generated at:', configOutputPath)

// 打包 Electron
console.log('Packaging Electron...')
execSync('npx electron-builder', {
    cwd: rootDir,
    stdio: 'inherit'
})

// 额外复制一份配置文件到输出目录供用户参考
const distConfigPath = path.join(distDir, 'config.json')
if (fs.existsSync(distDir)) {
    fs.writeFileSync(distConfigPath, JSON.stringify(configTemplate, null, 2))
    console.log('Config file copied to dist for reference:', distConfigPath)
}

console.log('Build complete!')
console.log('')
console.log('Usage:')
console.log('  1. Run dist/BDDB-Setup-x.x.x.exe to install')
console.log('  2. Edit config.json in installation directory to change database settings')
console.log('  3. Restart application to apply changes')
