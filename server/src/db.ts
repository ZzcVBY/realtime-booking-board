import { DatabaseSync } from "node:sqlite";
import type { Slot, Booking, SlotView, OccupiedInterval } from "./types.js";

/**
 * 数据层：用 Node 内置 node:sqlite（零原生依赖），WAL 模式。
 * Repository 函数返回"领域对象"，与数据库行解耦，便于视图与测试。
 */
export function initDb(path: string = process.env.DB_PATH ?? "./data.db"): DatabaseSync {
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 1,
      creator_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slot_id INTEGER NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_bookings_slot ON bookings(slot_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
  `);
  return db;
}

export function listSlotViews(db: DatabaseSync): SlotView[] {
  const slots = db
    .prepare(
      `SELECT id, title, description, start_time as startTime, end_time as endTime,
              capacity, creator_id as creatorId, created_at as createdAt
       FROM slots ORDER BY start_time ASC`,
    )
    .all() as unknown as Slot[];
  const bookingRows = db
    .prepare(
      `SELECT id, slot_id as slotId, user_id as userId, status, created_at as createdAt
       FROM bookings WHERE status = 'active' ORDER BY created_at ASC`,
    )
    .all() as unknown as Booking[];
  return slots.map((s) => {
    const bookings = bookingRows.filter((b) => b.slotId === s.id);
    return { ...s, bookings, bookedCount: bookings.length };
  });
}

export function getSlot(db: DatabaseSync, id: number): Slot | undefined {
  const row = db
    .prepare(
      `SELECT id, title, description, start_time as startTime, end_time as endTime,
              capacity, creator_id as creatorId, created_at as createdAt
       FROM slots WHERE id = ?`,
    )
    .get(id) as unknown as Slot | undefined;
  return row;
}

export function insertSlot(
  db: DatabaseSync,
  s: Omit<Slot, "id" | "createdAt">,
): Slot {
  const createdAt = Date.now();
  const res = db
    .prepare(
      `INSERT INTO slots (title, description, start_time, end_time, capacity, creator_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(s.title, s.description, s.startTime, s.endTime, s.capacity, s.creatorId, createdAt);
  return { id: Number(res.lastInsertRowid), ...s, createdAt };
}

export function deleteSlot(db: DatabaseSync, id: number): boolean {
  const res = db.prepare("DELETE FROM slots WHERE id = ?").run(id);
  return res.changes > 0;
}

/** 该用户所有 active 预约所占据的时间区间（跨排班位，供冲突检测） */
export function occupiedIntervalsForUser(db: DatabaseSync, userId: string): OccupiedInterval[] {
  const rows = db
    .prepare(
      `SELECT b.id as bookingId, b.slot_id as slotId, s.start_time as startTime, s.end_time as endTime
       FROM bookings b
       JOIN slots s ON s.id = b.slot_id
       WHERE b.user_id = ? AND b.status = 'active'`,
    )
    .all(userId) as unknown as OccupiedInterval[];
  return rows;
}

export function countActiveBookings(db: DatabaseSync, slotId: number): number {
  const row = db
    .prepare("SELECT COUNT(*) as n FROM bookings WHERE slot_id = ? AND status = 'active'")
    .get(slotId) as { n: number };
  return row.n;
}

export function insertBooking(db: DatabaseSync, slotId: number, userId: string): Booking {
  const createdAt = Date.now();
  const res = db
    .prepare(
      "INSERT INTO bookings (slot_id, user_id, status, created_at) VALUES (?, ?, 'active', ?)",
    )
    .run(slotId, userId, createdAt);
  return { id: Number(res.lastInsertRowid), slotId, userId, status: "active", createdAt };
}

export function getBooking(db: DatabaseSync, id: number):
  | (Booking & { slotStart: number })
  | undefined {
  const row = db
    .prepare(
      `SELECT b.id as id, b.slot_id as slotId, b.user_id as userId, b.status as status,
              b.created_at as createdAt, s.start_time as slotStart
       FROM bookings b
       JOIN slots s ON s.id = b.slot_id WHERE b.id = ?`,
    )
    .get(id) as unknown as (Booking & { slotStart: number }) | undefined;
  return row;
}

export function cancelBooking(db: DatabaseSync, id: number): boolean {
  const res = db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(id);
  return res.changes > 0;
}
