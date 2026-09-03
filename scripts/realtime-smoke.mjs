#!/usr/bin/env node
/**
 * 实时通道集成冒烟测试：注册后带 token 连上 Socket.IO，验证鉴权 + 服务端推送事件。
 * 用法：先启动后端（默认 3000），再 `node scripts/realtime-smoke.mjs`。
 */
import { io } from "socket.io-client";

const BASE = process.env.BASE ?? "http://localhost:3000";
const USER = `demo_${Math.floor(Math.random() * 1e6)}`;

async function ensureUser() {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: USER, password: "secret123" }),
  });
  const body = await res.json();
  if (!res.ok && body.code !== "INVALID_INPUT") throw new Error("register failed");
  // 已存在则登录，否则用本次注册 token
  if (body.ok) return body.data.accessToken;
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: USER, password: "secret123" }),
  });
  return (await login.json()).data.accessToken;
}

const token = await ensureUser();
const socket = io(BASE, { transports: ["websocket"], auth: { token } });

const received = [];
socket.on("sync", () => received.push("sync"));
socket.on("slot:created", () => received.push("slot:created"));
socket.on("booking:created", () => received.push("booking:created"));

const timeout = setTimeout(() => {
  console.error("REALTIME FAIL: 未在超时内收到预期事件", received);
  process.exit(1);
}, 5000);

socket.on("connect", async () => {
  try {
    const now = Date.now();
    const resp = await fetch(`${BASE}/api/slots`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: "实时验证",
        startTime: now + 3600000,
        endTime: now + 7200000,
        capacity: 1,
      }),
    });
    const created = await resp.json();
    console.log("slot created id =", created.data.id);

    await fetch(`${BASE}/api/slots/${created.data.id}/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    });
    console.log("booking submitted");

    setTimeout(() => {
      const ok =
        received.includes("sync") &&
        received.includes("slot:created") &&
        received.includes("booking:created");
      clearTimeout(timeout);
      console.log("events received =", received);
      console.log(ok ? "REALTIME PASS" : "REALTIME FAIL");
      process.exit(ok ? 0 : 1);
    }, 1500);
  } catch (err) {
    clearTimeout(timeout);
    console.error("ERR", err);
    process.exit(1);
  }
});

socket.on("connect_error", (err) => {
  clearTimeout(timeout);
  console.error("connect_error", err.message);
  process.exit(1);
});
