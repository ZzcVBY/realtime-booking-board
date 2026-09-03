import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SlotCard } from "./SlotCard";
import type { Booking, SlotView } from "../types";

const slot: SlotView = {
  id: 1,
  title: "晨会",
  description: "同步进度",
  startTime: Date.now() + 3_600_000,
  endTime: Date.now() + 7_200_000,
  capacity: 1,
  creatorId: "alice",
  createdAt: Date.now(),
  bookings: [],
  bookedCount: 0,
};

describe("SlotCard", () => {
  it("显示标题与可预约状态", () => {
    render(
      <SlotCard slot={slot} currentUser="bob" onBook={vi.fn()} onCancel={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(screen.getByText("晨会")).toBeInTheDocument();
    expect(screen.getByText("预约")).toBeInTheDocument();
  });

  it("已约满时禁用预约", () => {
    const full: SlotView = { ...slot, capacity: 1, bookings: [{ id: 1, slotId: 1, userId: "x", status: "active", createdAt: Date.now() } as Booking], bookedCount: 1 };
    render(
      <SlotCard slot={full} currentUser="bob" onBook={vi.fn()} onCancel={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(screen.getByText("已约满")).toBeDisabled();
  });

  it("当前用户已预约时显示取消按钮", () => {
    const mine: SlotView = {
      ...slot,
      bookings: [{ id: 7, slotId: 1, userId: "bob", status: "active", createdAt: Date.now() } as Booking],
      bookedCount: 1,
    };
    render(
      <SlotCard slot={mine} currentUser="bob" onBook={vi.fn()} onCancel={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(screen.getByText("取消我的预约")).toBeInTheDocument();
  });

  it("只有创建者能看到删除按钮", () => {
    render(
      <SlotCard slot={slot} currentUser="alice" onBook={vi.fn()} onCancel={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(screen.getByText("删除")).toBeInTheDocument();
  });

  it("点击预约会触发回调", () => {
    const onBook = vi.fn();
    render(
      <SlotCard slot={slot} currentUser="bob" onBook={onBook} onCancel={vi.fn()} onDelete={vi.fn()} />,
    );
    fireEvent.click(screen.getByText("预约"));
    expect(onBook).toHaveBeenCalledTimes(1);
  });
});
