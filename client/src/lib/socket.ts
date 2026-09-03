import { io, type Socket } from "socket.io-client";
import { getToken } from "./api";

/**
 * 创建与后端同一源头的实时连接。开发期由 Vite 代理 /socket.io 到后端。
 * 连接握手时携带 token，后端 socket 中间件校验，未授权会被拒绝。
 */
export function createSocket(): Socket {
  return io("/", { transports: ["websocket"], auth: { token: getToken() } });
}
