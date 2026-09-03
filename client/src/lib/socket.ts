import { io, type Socket } from "socket.io-client";

/**
 * 创建与后端同一源头的实时连接。
 * 开发期由 Vite 代理 /socket.io 到后端；生产期同源部署，无需额外配置。
 */
export function createSocket(): Socket {
  return io("/", { transports: ["websocket"] });
}
