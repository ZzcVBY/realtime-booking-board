import { describe, it, expect } from "vitest";
import { fmtTime, fmtRange, isPast } from "./format";

describe("format helpers", () => {
  it("格式化时间", () => {
    const ms = new Date(2026, 0, 5, 9, 30).getTime();
    expect(fmtTime(ms)).toMatch(/01\/05/);
  });

  it("格式化区间", () => {
    const start = new Date(2026, 0, 5, 9, 0).getTime();
    const end = new Date(2026, 0, 5, 10, 0).getTime();
    expect(fmtRange(start, end)).toContain("–");
  });

  it("判断过去", () => {
    expect(isPast(Date.now() - 1000)).toBe(true);
    expect(isPast(Date.now() + 100_000)).toBe(false);
  });
});
