# syntax=docker/dockerfile:1

# ---- base ----
FROM node:22-alpine AS base

# 安装必要的运行时依赖
RUN apk add --no-cache libc6-compat

# 设置工作目录
WORKDIR /app

# ---- deps ----
FROM base AS deps

COPY package.json package-lock.json ./
RUN npm ci --only=production

# ---- builder ----
FROM base AS builder

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 构建生产版本
RUN npm run build

# ---- runner ----
FROM base AS runner

# 创建非 root 用户运行应用
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# 复制 standalone 构建产物
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 复制必要的 node_modules (standalone 模式不会自动复制所有依赖)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@ctrl/qbittorrent ./node_modules/@ctrl/qbittorrent
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@seald-io/nedb ./node_modules/@seald-io/nedb
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/nanoid ./node_modules/nanoid

# 创建数据目录并设置权限
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

VOLUME /app/data

# 切换到非 root 用户
USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
