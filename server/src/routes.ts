import { Router, type Request, type Response } from "express";
import type { DatabaseSync } from "node:sqlite";
import {
  listSlotViews,
  getSlot,
  insertSlot,
  deleteSlot,
  occupiedIntervalsForUser,
  countActiveBookings,
  insertBooking,
  getBooking,
  cancelBooking,
  createUser,
  getUserByUsername,
  getUserById,
  createRefreshToken,
  getRefreshTokenByHash,
  revokeRefreshToken,
} from "./db.js";
import {
  validateNewSlot,
  tryBook,
  tryCancelBooking,
  canDeleteSlot,
  canManageBooking,
} from "./domain.js";
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  generateRefreshToken,
  hashToken,
  REFRESH_TOKEN_TTL_MS,
  requireAuth,
  getAuthUser,
  validateUsername,
  validatePassword,
} from "./auth.js";
import type { ErrorCode } from "./domain.js";

interface Realtime {
  broadcast(event: string, payload: unknown): void;
}

function mapError(res: Response, code: ErrorCode, message = "操作失败"): void {
  const status: Record<ErrorCode, number> = {
    INVALID_INPUT: 400,
    PAST_SLOT: 409,
    SLOT_NOT_FOUND: 404,
    SLOT_FULL: 409,
    OVERLAP: 409,
    NOT_OWNER: 403,
    BOOKING_NOT_FOUND: 404,
    SLOT_DELETED: 410,
  };
  res.status(status[code] ?? 400).json({ ok: false, code, message });
}

/** 公开的认证路由：注册 / 登录 / 当前用户 */
export function createAuthRouter(db: DatabaseSync): Router {
  const router = Router();

  function issueSession(user: { id: number; username: string }) {
    const accessToken = signAccessToken(user.id, user.username);
    const refreshToken = generateRefreshToken();
    createRefreshToken(db, user.id, hashToken(refreshToken), Date.now() + REFRESH_TOKEN_TTL_MS);
    return { accessToken, refreshToken, user };
  }

  router.post("/register", (req, res) => {
    const { username, password } = req.body ?? {};
    const nameErr = validateUsername(username);
    if (nameErr) return mapError(res, "INVALID_INPUT", nameErr);
    const pwErr = validatePassword(password);
    if (pwErr) return mapError(res, "INVALID_INPUT", pwErr);

    if (getUserByUsername(db, username)) {
      return mapError(res, "INVALID_INPUT", "该用户名已被注册");
    }
    const { hash, salt } = hashPassword(password);
    const user = createUser(db, username, hash, salt);
    res.status(201).json({ ok: true, data: issueSession(user) });
  });

  router.post("/login", (req, res) => {
    const { username, password } = req.body ?? {};
    const record = getUserByUsername(db, String(username ?? ""));
    if (!record || !verifyPassword(String(password ?? ""), record.salt, record.passwordHash)) {
      return res.status(401).json({ ok: false, code: "INVALID_CREDENTIALS", message: "用户名或密码错误" });
    }
    res.json({
      ok: true,
      data: issueSession({ id: record.id, username: record.username }),
    });
  });

  router.post("/refresh", (req, res) => {
    const { refreshToken } = req.body ?? {};
    const record = getRefreshTokenByHash(db, hashToken(String(refreshToken ?? "")));
    if (!record || record.revoked === 1 || record.expiresAt < Date.now()) {
      return res.status(401).json({ ok: false, code: "INVALID_REFRESH", message: "登录已失效，请重新登录" });
    }
    const user = getUserById(db, record.userId);
    if (!user) return res.status(401).json({ ok: false, code: "USER_NOT_FOUND", message: "用户不存在" });
    // 轮换：作废旧 refresh，签发新的一对
    revokeRefreshToken(db, record.id);
    res.json({ ok: true, data: issueSession(user) });
  });

  router.post("/logout", (req, res) => {
    const { refreshToken } = req.body ?? {};
    const record = getRefreshTokenByHash(db, hashToken(String(refreshToken ?? "")));
    if (record && record.revoked === 0) revokeRefreshToken(db, record.id);
    res.json({ ok: true });
  });

  router.get("/me", requireAuth, (req, res) => {
    const user = getAuthUser(req);
    const record = getUserById(db, user.sub);
    if (!record) return res.status(404).json({ ok: false, code: "USER_NOT_FOUND", message: "用户不存在" });
    res.json({ ok: true, data: record });
  });

  return router;
}

/** 受保护的业务路由（挂载在 requireAuth 之后） */
export function createRouter(db: DatabaseSync, realtime: Realtime): Router {
  const router = Router();

  router.get("/slots", (_req, res) => {
    res.json({ ok: true, data: listSlotViews(db) });
  });

  router.post("/slots", (req, res) => {
    const now = Date.now();
    const v = validateNewSlot({ ...req.body, creatorId: getAuthUser(req).sub }, now);
    if (!v.ok) return mapError(res, v.code, v.message);

    const slot = insertSlot(db, v.value);
    realtime.broadcast("slot:created", { slot: { ...slot, creatorName: getAuthUser(req).username, bookings: [], bookedCount: 0 } });
    res.status(201).json({ ok: true, data: slot });
  });

  router.delete("/slots/:id", (req, res) => {
    const id = Number(req.params.id);
    const slot = getSlot(db, id);
    if (!slot) return mapError(res, "SLOT_NOT_FOUND", "排班不存在");

    const perm = canDeleteSlot(slot.creatorId, getAuthUser(req).sub);
    if (!perm.ok) return mapError(res, perm.code, perm.message);

    deleteSlot(db, id);
    realtime.broadcast("slot:deleted", { slotId: id });
    res.json({ ok: true });
  });

  router.post("/slots/:id/book", (req, res) => {
    const slotId = Number(req.params.id);
    const slot = getSlot(db, slotId);
    if (!slot) return mapError(res, "SLOT_NOT_FOUND", "排班不存在");

    const userId = getAuthUser(req).sub;
    const now = Date.now();
    const occupied = occupiedIntervalsForUser(db, userId);
    const activeCount = countActiveBookings(db, slotId);
    const decision = tryBook(slot, occupied, activeCount, now);
    if (!decision.ok) return mapError(res, decision.code, decision.message);

    const booking = insertBooking(db, slotId, userId);
    realtime.broadcast("booking:created", { booking: { ...booking, userName: getAuthUser(req).username } });
    res.status(201).json({ ok: true, data: { ...booking, userName: getAuthUser(req).username } });
  });

  router.post("/bookings/:id/cancel", (req, res) => {
    const id = Number(req.params.id);
    const booking = getBooking(db, id);
    if (!booking) return mapError(res, "BOOKING_NOT_FOUND", "预约不存在");

    const ownerCheck = canManageBooking(booking.userId, getAuthUser(req).sub);
    if (!ownerCheck.ok) return mapError(res, ownerCheck.code, ownerCheck.message);

    const decision = tryCancelBooking(booking.status, booking.slotStart, Date.now());
    if (!decision.ok) return mapError(res, decision.code, decision.message);

    cancelBooking(db, id);
    realtime.broadcast("booking:cancelled", { bookingId: id });
    res.json({ ok: true });
  });

  return router;
}
