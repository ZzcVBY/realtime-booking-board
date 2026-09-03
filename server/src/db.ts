import { DatabaseSync } from "node:sqlite";
import type { Slot, Booking, SlotView, OccupiedInterval, User } from "./types.js";

/**
 * 数据层：用 Node 内置 node:sqlite（零原生依赖），WAL 模式。
 * 身份为整数 user id；视图通过关联用户表带出 username 用于展示。
 */
export function initDb(path: string = process.env.DB_PATH ?? "./data.db"): DatabaseSync {
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 1,
      creator_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slot_id INTEGER NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_bookings_slot ON bookings(slot_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
  `);
  return db;
}

// ---------- users ----------
export function createUser(
  db: DatabaseSync,
  username: string,
  passwordHash: string,
  salt: string,
): User {
  const createdAt = Date.now();
  const res = db
    .prepare("INSERT INTO users (username, password_hash, salt, created_at) VALUES (?, ?, ?, ?)")
    .run(username, passwordHash, salt, createdAt);
  return { id: Number(res.lastInsertRowid), username, createdAt };
}

export function getUserByUsername(
  db: DatabaseSync,
  username: string,
): (User & { passwordHash: string; salt: string }) | undefined {
  const row = db
    .prepare(
      `SELECT id, username, password_hash as passwordHash, salt, created_at as createdAt
       FROM users WHERE username = ?`,
    )
    .get(username) as unknown as (User & { passwordHash: string; salt: string }) | undefined;
  return row;
}

export function getUserById(db: DatabaseSync, id: number): User | undefined {
  const row = db
    .prepare("SELECT id, username, created_at as createdAt FROM users WHERE id = ?")
    .get(id) as unknown as User | undefined;
  return row;
}

// ---------- slots / bookings ----------
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
    .all() as unknown as (Omit<Booking, "userName">)[];
  const userMap = new Map(
    (db.prepare("SELECT id, username FROM users").all() as { id: number; username: string }[]).map(
      (u) => [u.id, u.username],
    ),
  );
  return slots.map((s) => {
    const bookings = bookingRows
      .filter((b) => b.slotId === s.id)
      .map((b) => ({ ...b, userName: userMap.get(b.userId) ?? "已注销" }));
    return { ...s, creatorName: userMap.get(s.creatorId) ?? "已注销", bookings, bookedCount: bookings.length };
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

export function insertSlot(db: DatabaseSync, s: Omit<Slot, "id" | "createdAt">): Slot {
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
export function occupiedIntervalsForUser(db: DatabaseSync, userId: number): OccupiedInterval[] {
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

export function insertBooking(db: DatabaseSync, slotId: number, userId: number): Booking {
  const createdAt = Date.now();
  const res = db
    .prepare("INSERT INTO bookings (slot_id, user_id, status, created_at) VALUES (?, ?, 'active', ?)")
    .run(slotId, userId, createdAt);
  return { id: Number(res.lastInsertRowid), slotId, userId, userName: "", status: "active", createdAt };
}

export function getBooking(db: DatabaseSync, id: number):
  | (Booking & { slotStart: number })
  | undefined {
  const row = db
    .prepare(
      `SELECT b.id as id, b.slot_id as slotId, b.user_id as userId, b.status as status,
              b.created_at as createdAt, s.start_time as slotStart, u.username as userName
       FROM bookings b
       JOIN slots s ON s.id = b.slot_id
       JOIN users u ON u.id = b.user_id
       WHERE b.id = ?`,
    )
    .get(id) as unknown as (Booking & { slotStart: number }) | undefined;
  return row;
}

export function cancelBooking(db: DatabaseSync, id: number): boolean {
  const res = db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(id);
  return res.changes > 0;
}
