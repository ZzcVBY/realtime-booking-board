import { describe, it, expect } from "vitest";
import {
  validateNewSlot,
  intervalsOverlap,
  tryBook,
  tryCancelBooking,
  canDeleteSlot,
} from "../src/domain.js";
import type { Slot, OccupiedInterval } from "../src/types.js";

const NOW = 1_700_000_000_000;
const H = 3_600_000;
const DAY = 24 * H;

function makeSlot(over: Partial<Slot> = {}): Slot {
  return {
    id: 1,
    title: "会议",
    description: "",
    startTime: NOW + DAY,
    endTime: NOW + DAY + H,
    capacity: 1,
    creatorId: "alice",
    createdAt: NOW,
    ...over,
  };
}

describe("validateNewSlot", () => {
  it("接受合法输入并规范化", () => {
    const r = validateNewSlot(
      { title: "  晨会  ", startTime: NOW + DAY, endTime: NOW + DAY + H, creatorId: "alice" },
      NOW,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.title).toBe("晨会");
      expect(r.value.capacity).toBe(1);
    }
  });

  it("拒绝空标题", () => {
    const r = validateNewSlot(
      { title: "   ", startTime: NOW + DAY, endTime: NOW + DAY + H, creatorId: "alice" },
      NOW,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("INVALID_INPUT");
  });

  it("拒绝结束早于或等于开始", () => {
    const r = validateNewSlot(
      { title: "x", startTime: NOW + DAY, endTime: NOW + DAY, creatorId: "alice" },
      NOW,
    );
    expect(r.ok).toBe(false);
  });

  it("拒绝过去的时间", () => {
    const r = validateNewSlot(
      { title: "x", startTime: NOW - H, endTime: NOW, creatorId: "alice" },
      NOW,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("PAST_SLOT");
  });

  it("拒绝超出容量的容量值", () => {
    const r = validateNewSlot(
      { title: "x", startTime: NOW + DAY, endTime: NOW + DAY + H, capacity: 0, creatorId: "alice" },
      NOW,
    );
    expect(r.ok).toBe(false);
  });

  it("拒绝超过 6 小时的时长", () => {
    const r = validateNewSlot(
      { title: "x", startTime: NOW + DAY, endTime: NOW + DAY + 7 * H, creatorId: "alice" },
      NOW,
    );
    expect(r.ok).toBe(false);
  });
});

describe("intervalsOverlap", () => {
  it("识别重叠", () => {
    expect(intervalsOverlap(0, 10, 5, 15)).toBe(true);
  });
  it("首尾相接不算重叠", () => {
    expect(intervalsOverlap(0, 10, 10, 20)).toBe(false);
  });
  it("完全包含也算重叠", () => {
    expect(intervalsOverlap(0, 100, 10, 20)).toBe(true);
  });
});

describe("tryBook", () => {
  it("已开始的排班不能预约", () => {
    const r = tryBook(makeSlot({ startTime: NOW - H, endTime: NOW }), [], 0, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("PAST_SLOT");
  });

  it("容量已满则拒绝", () => {
    const r = tryBook(makeSlot({ capacity: 1 }), [], 1, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("SLOT_FULL");
  });

  it("同一用户存在时间重叠的预约则拒绝", () => {
    const booked: OccupiedInterval[] = [
      { bookingId: 9, slotId: 2, startTime: NOW + DAY + 30 * 60000, endTime: NOW + DAY + 2 * H },
    ];
    const r = tryBook(makeSlot(), booked, 0, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("OVERLAP");
  });

  it("没有冲突时预约成功", () => {
    const r = tryBook(makeSlot(), [], 0, NOW);
    expect(r.ok).toBe(true);
  });
});

describe("tryCancelBooking / canDeleteSlot", () => {
  it("不能取消已开始的预约", () => {
    const r = tryCancelBooking("active", NOW - H, NOW);
    expect(r.ok).toBe(false);
  });
  it("不能取消已取消的预约", () => {
    const r = tryCancelBooking("cancelled", NOW + DAY, NOW);
    expect(r.ok).toBe(false);
  });
  it("取消合法预约成功", () => {
    expect(tryCancelBooking("active", NOW + DAY, NOW).ok).toBe(true);
  });
  it("非创建者不能删除", () => {
    const r = canDeleteSlot("alice", "bob");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("NOT_OWNER");
  });
  it("创建者可以删除", () => {
    expect(canDeleteSlot("alice", "alice").ok).toBe(true);
  });
});
