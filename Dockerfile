# syntax=docker/dockerfile:1
# 多阶段构建：先构建，再把产物拷进精简运行镜像。
# 运行时只用 node:24-slim 自带 node:sqlite，无需任何原生依赖。

# ---------- 构建阶段 ----------
FROM node:24-slim AS build
WORKDIR /app

# 先复制 manifest，利用 Docker 层缓存（改代码不重装依赖）
COPY package.json package-lock.json .npmrc ./
COPY server/package.json ./server/package.json
COPY client/package.json ./client/package.json
RUN npm ci

# 复制源码并构建（server 出 dist，client 出 dist）
COPY . .
RUN npm run build

# ---------- 运行阶段 ----------
FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# 运行时依赖（workspaces 提升到根 node_modules）与构建产物
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/client/package.json ./client/package.json
COPY --from=build /app/node_modules ./node_modules
# 只保留生产依赖，去掉 vite/vitest/tsx/typescript 等 dev 依赖，缩小镜像
RUN npm prune --omit=dev
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist

EXPOSE 3000
# 单进程托管：REST + Socket.IO + 前端静态文件 + SPA 回退
CMD ["node", "server/dist/index.js"]
