import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import { type NextFunction, type Request, type Response } from "express";
import type { AuthUser } from "./types.js";

// 生产环境必须用环境变量提供；默认值仅便于本地开发。
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";
const ACCESS_TOKEN_TTL = "15m";
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 天

/** 密码哈希：scrypt 加盐，零原生依赖 */
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const actual = Buffer.from(scryptSync(password, salt, 32).toString("hex"), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function signAccessToken(userId: number, username: string): string {
  return jwt.sign({ username }, JWT_SECRET, {
    subject: String(userId),
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

export function verifyAccessToken(token: string): AuthUser | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & { username?: string };
    const sub = Number(payload.sub);
    if (!Number.isInteger(sub) || !payload.username) return null;
    return { sub, username: payload.username };
  } catch {
    return null;
  }
}

/** 生成不透明 refresh token（客户端持有原文，服务端只存哈希） */
export function generateRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** 用户名校验：字母/数字/下划线/短横线，2–32 位 */
export function validateUsername(name: unknown): string | null {
  if (typeof name !== "string") return "用户名格式不正确";
  const v = name.trim();
  if (!/^[\p{L}\p{N}_-]{2,32}$/u.test(v)) {
    return "用户名需 2–32 位（字母/数字/下划线/短横线）";
  }
  return null;
}

export function validatePassword(pw: unknown): string | null {
  if (typeof pw !== "string") return "密码需为字符串";
  if (pw.length < 6) return "密码至少 6 位";
  if (pw.length > 72) return "密码过长（最多 72 位）";
  return null;
}

/** Express 中间件：解析 Bearer token，验证后把 AuthUser 挂到 req.user */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  const user = token ? verifyAccessToken(token) : null;
  if (!user) {
    res.status(401).json({ ok: false, code: "UNAUTHORIZED", message: "请先登录" });
    return;
  }
  (req as Request & { user: AuthUser }).user = user;
  next();
}

/** 授权给路由使用的当前登录用户 */
export function getAuthUser(req: Request): AuthUser {
  return (req as Request & { user: AuthUser }).user;
}
