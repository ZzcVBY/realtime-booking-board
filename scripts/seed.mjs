#!/usr/bin/env node
/**
 * 演示数据脚本：登录后向后端 /api/slots 写入若干条未来时间的排班。
 * 用法：先启动后端（默认 3000），再 `node scripts/seed.mjs`（可重复运行）。
 */
const BASE = process.env.BASE ?? "http://localhost:3000";

const H = 60 * 60 * 1000;
const day = (n) => Date.now() + n * 24 * H;

// 注册（或登录）一个种子用户，拿 token
const SEED_USER = `seed_${Math.floor(Math.random() * 1e6)}`;
async function ensureToken() {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: SEED_USER, password: "secret123" }),
  });
  const body = await res.json();
  if (body.ok) return body.data.token;
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: SEED_USER, password: "secret123" }),
  });
  return (await login.json()).data.token;
}

const token = await ensureToken();
const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

const demo = [
  {
    title: "产品评审会",
    description: "评审 Q3 迭代需求与排期",
    startTime: day(1) + 9 * H,
    endTime: day(1) + 10.5 * H,
    capacity: 6,
  },
  {
    title: "技术分享：虚拟化渲染",
    description: "讲 @tanstack/react-virtual 原理与实现",
    startTime: day(1) + 14 * H,
    endTime: day(1) + 15 * H,
    capacity: 20,
  },
  {
    title: "1v1 沟通",
    description: "一对一职业发展沟通",
    startTime: day(2) + 10 * H,
    endTime: day(2) + 11 * H,
    capacity: 1,
  },
  {
    title: "灰度发布窗口",
    description: "v2.3.0 灰度发布，需值守",
    startTime: day(2) + 20 * H,
    endTime: day(3) + 2 * H,
    capacity: 3,
  },
  {
    title: "设计走查",
    description: "新看板视觉稿走查",
    startTime: day(3) + 15 * H,
    endTime: day(3) + 16.5 * H,
    capacity: 4,
  },
  {
    title: "团队复盘",
    description: "月度敏捷复盘",
    startTime: day(4) + 16 * H,
    endTime: day(4) + 17.5 * H,
    capacity: 12,
  },
];

for (const slot of demo) {
  const res = await fetch(`${BASE}/api/slots`, { method: "POST", headers, body: JSON.stringify(slot) });
  const body = await res.json();
  if (res.ok) console.log("✓", body.data.title);
  else console.log("✗", slot.title, body.message ?? body.code);
}
