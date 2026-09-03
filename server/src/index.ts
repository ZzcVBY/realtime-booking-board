import express from "express";
import cors from "cors";
import http from "node:http";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { initDb } from "./db.js";
import { createRouter } from "./routes.js";
import { attachRealtime } from "./socket.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3000);
const app = express();
app.use(cors());
app.use(express.json());

const db = initDb();
const httpServer = http.createServer(app);
const realtime = attachRealtime(httpServer, db);

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api", createRouter(db, realtime));

// 生产模式：若前端已构建，则由后端托管（单进程即可跑通全栈）
const clientDist = path.resolve(__dirname, "..", "..", "client", "dist");
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) return next();
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

httpServer.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
