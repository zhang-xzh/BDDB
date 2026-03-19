# BDDB Electron 桌面应用

## 开发模式

```bash
# 同时启动 Next.js dev server 和 Electron
npm run electron:dev
```

这会在 http://localhost:3000 启动开发服务器，然后 Electron 加载该地址。

## 生产构建

```bash
# 构建静态文件并打包 Electron 应用
npm run electron:build
```

输出目录：`dist/`

## 字体渲染优化

Electron 配置启用了以下优化：

1. **禁用 LCD 亚像素抗锯齿** - 避免彩边
2. **强制整数像素渲染** - `transform: translateZ(0)`
3. **禁用字体连字** - `font-feature-settings: 'liga' 0`
4. **固定缩放因子** - 禁用 Ctrl+滚轮缩放

## 注意事项

- 开发模式下需要保持 Next.js dev server 运行
- API 路由需要后端服务支持，生产构建需要配合独立后端
- 静态导出时图片使用 `unoptimized: true`
