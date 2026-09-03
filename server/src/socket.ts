import http from "node:http";
import { Server } from "socket.io";
import type { DatabaseSync } from "node:sqlite";
import { listSlotViews } from "./db.js";
import { verifyToken } from "./auth.js";

export interface RealtimeBridge {
  broadcast(event: string, payload: unknown): void;
}

/**
 * 实时层：基于 Socket.IO。所有写操作后，由 routes 通过 broadcast
 * 把服务端权威状态推给所有客户端，实现"多人所见即所得"。
 */
export function attachRealtime(httpServer: http.Server, db: DatabaseSync): RealtimeBridge {
  const io = new Server(httpServer, {
    cors: { origin: "*" },
    transports: ["websocket", "polling"],
  });

  // 连接握手时校验 token，未授权直接拒绝，避免未登录者收到实时广播
  io.use((socket, next) => {
    const token = (socket.handshake.auth as { token?: string } | undefined)?.token;
    const user = token ? verifyToken(token) : null;
    if (!user) return next(new Error("unauthorized"));
    (socket.data as { user: { sub: number; username: string } }).user = user;
    next();
  });

  io.on("connection", (socket) => {
    // 客户端连上即拉全量，保证掉线重连后一致
    socket.emit("sync", { slots: listSlotViews(db) });
  });

  const broadcast: RealtimeBridge["broadcast"] = (event, payload) => {
    io.emit(event, payload);
  };

  return { broadcast };
}
