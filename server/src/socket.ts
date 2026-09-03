import http from "node:http";
import { Server } from "socket.io";
import type { DatabaseSync } from "node:sqlite";
import { listSlotViews } from "./db.js";

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

  io.on("connection", (socket) => {
    // 客户端连上即拉全量，保证掉线重连后一致
    socket.emit("sync", { slots: listSlotViews(db) });
  });

  const broadcast: RealtimeBridge["broadcast"] = (event, payload) => {
    io.emit(event, payload);
  };

  return { broadcast };
}
