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
} from "./db.js";
import { validateNewSlot, tryBook, tryCancelBooking, canDeleteSlot } from "./domain.js";
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

export function createRouter(db: DatabaseSync, realtime: Realtime): Router {
  const router = Router();

  router.get("/slots", (_req, res) => {
    const slots = listSlotViews(db);
    // 用 immutable/无副作用的方式返回快照，供前端乐观更新 base
    res.json({ ok: true, data: slots });
  });

  router.post("/slots", (req, res) => {
    const now = Date.now();
    const v = validateNewSlot(req.body, now);
    if (!v.ok) return mapError(res, v.code, v.message);

    const slot = insertSlot(db, v.value);
    realtime.broadcast("slot:created", { slot: { ...slot, bookings: [], bookedCount: 0 } });
    res.status(201).json({ ok: true, data: slot });
  });

  router.delete("/slots/:id", (req, res) => {
    const id = Number(req.params.id);
    const slot = getSlot(db, id);
    if (!slot) return mapError(res, "SLOT_NOT_FOUND", "排班不存在");

    const requester = String(req.body?.requesterId ?? req.query.requesterId ?? "");
    const perm = canDeleteSlot(slot.creatorId, requester);
    if (!perm.ok) return mapError(res, perm.code, perm.message);

    deleteSlot(db, id);
    realtime.broadcast("slot:deleted", { slotId: id });
    res.json({ ok: true });
  });

  router.post("/slots/:id/book", (req, res) => {
    const slotId = Number(req.params.id);
    const slot = getSlot(db, slotId);
    if (!slot) return mapError(res, "SLOT_NOT_FOUND", "排班不存在");

    const userId = String(req.body?.userId ?? "").trim();
    if (!userId) return mapError(res, "INVALID_INPUT", "请先填写你的昵称");

    const now = Date.now();
    const occupied = occupiedIntervalsForUser(db, userId);
    const activeCount = countActiveBookings(db, slotId);
    const decision = tryBook(slot, occupied, activeCount, now);
    if (!decision.ok) return mapError(res, decision.code, decision.message);

    const booking = insertBooking(db, slotId, userId);
    realtime.broadcast("booking:created", { booking });
    res.status(201).json({ ok: true, data: booking });
  });

  router.post("/bookings/:id/cancel", (req, res) => {
    const id = Number(req.params.id);
    const booking = getBooking(db, id);
    if (!booking) return mapError(res, "BOOKING_NOT_FOUND", "预约不存在");

    const decision = tryCancelBooking(booking.status, booking.slotStart, Date.now());
    if (!decision.ok) return mapError(res, decision.code, decision.message);

    cancelBooking(db, id);
    realtime.broadcast("booking:cancelled", { bookingId: id });
    res.json({ ok: true });
  });

  return router;
}
