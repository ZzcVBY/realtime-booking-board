/**
 * 纯业务逻辑层：不依赖数据库、不依赖网络。
 * 所有"规则"集中在这里，便于单元测试，也便于面试讲清"为什么这样设计"。
 * 设计原则：后端是权威（authoritative），前端只做乐观展示，最终以这里为准。
 */
import type { Slot, OccupiedInterval } from "./types.js";

export type Result<T = undefined> =
  | { ok: true; value: T }
  | { ok: false; code: ErrorCode; message: string };

export type ErrorCode =
  | "INVALID_INPUT"
  | "PAST_SLOT"
  | "SLOT_NOT_FOUND"
  | "SLOT_FULL"
  | "OVERLAP"
  | "NOT_OWNER"
  | "BOOKING_NOT_FOUND"
  | "SLOT_DELETED";

export interface NewSlotInput {
  title: string;
  description?: string;
  startTime: number;
  endTime: number;
  capacity?: number;
  creatorId: number;
}

/** 校验通过、规范化之后的排班位（description 一定为字符串） */
export interface ValidatedSlot {
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  capacity: number;
  creatorId: number;
}

export const MAX_SLOT_DURATION_MS = 6 * 60 * 60 * 1000; // 单次最多 6 小时

/** 判断两个区间是否重叠（半开区间 [start,end) ，边界相接不算重叠） */
export function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** 校验一个新排班位的输入合法性。返回规范化后的 NewSlotInput 或错误。 */
export function validateNewSlot(input: NewSlotInput, nowMs: number): Result<ValidatedSlot> {
  const title = input.title.trim();
  if (!title) return fail("INVALID_INPUT", "标题不能为空");
  if (title.length > 80) return fail("INVALID_INPUT", "标题过长（最多 80 字符）");

  const startTime = Number(input.startTime);
  const endTime = Number(input.endTime);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    return fail("INVALID_INPUT", "时间格式不合法");
  }
  if (endTime <= startTime) return fail("INVALID_INPUT", "结束时间必须晚于开始时间");
  if (endTime - startTime > MAX_SLOT_DURATION_MS) return fail("INVALID_INPUT", "单次排班最长 6 小时");
  if (startTime < nowMs) return fail("PAST_SLOT", "不能创建过去的排班");

  const creatorId = Number(input.creatorId);
  if (!Number.isInteger(creatorId) || creatorId < 1) {
    return fail("INVALID_INPUT", "创建者无效");
  }

  const capacity = input.capacity == null ? 1 : Math.floor(Number(input.capacity));
  if (!Number.isFinite(capacity) || capacity < 1 || capacity > 64) {
    return fail("INVALID_INPUT", "容量需为 1–64");
  }

  return ok({
    title,
    description: (input.description ?? "").trim().slice(0, 400),
    startTime,
    endTime,
    capacity,
    creatorId,
  });
}

/**
 * 尝试预约一个排班位（核心冲突规则）。
 * 规则由后端强制，前端只做乐观更新。
 * @param slot        目标排班位（须存在）
 * @param userBooked  该用户当前已占用的时间区间（跨所有 active 预约）
 * @param slotActiveBookings 该排班位上当前 active 预约数
 * @param nowMs       当前时间
 */
export function tryBook(
  slot: Slot,
  userBooked: OccupiedInterval[],
  slotActiveBookings: number,
  nowMs: number,
): Result {
  // 1) 时间上是否已过期
  if (slot.startTime < nowMs) return fail("PAST_SLOT", "该排班已开始，无法预约");

  // 2) 容量是否已满
  if (slotActiveBookings >= slot.capacity) return fail("SLOT_FULL", "该排班已约满");

  // 3) 同一用户是否与已有预约重叠（跨排班位的冲突）
  for (const itv of userBooked) {
    if (intervalsOverlap(slot.startTime, slot.endTime, itv.startTime, itv.endTime)) {
      return fail("OVERLAP", "你已有时间重叠的预约");
    }
  }

  return ok();
}

export function tryCancelBooking(bookingStatus: string, slotStart: number, nowMs: number): Result {
  if (bookingStatus !== "active") return fail("BOOKING_NOT_FOUND", "该预约不存在或已取消");
  if (slotStart < nowMs) return fail("PAST_SLOT", "已开始的预约不能取消");
  return ok();
}

export function canDeleteSlot(creatorId: number, requesterId: number): Result {
  if (Number(requesterId) !== Number(creatorId)) {
    return fail("NOT_OWNER", "只有创建者能删除该排班");
  }
  return ok();
}

export function canManageBooking(ownerId: number, requesterId: number): Result {
  if (Number(requesterId) !== Number(ownerId)) {
    return fail("NOT_OWNER", "只有预约者本人能取消");
  }
  return ok();
}

function ok<T = undefined>(value?: T): Result<T> {
  return { ok: true, value: value as T };
}
function fail<T = undefined>(code: ErrorCode, message: string): Result<T> {
  return { ok: false, code, message };
}
