import type { Booking, CreateSlotInput, Slot, SlotView } from "../types";

const BASE = "/api";

/** 统一包装 fetch：非 2xx 抛结构化错误（含业务 code），成功取 data 字段 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await res.json();
  if (!res.ok) {
    throw body;
  }
  return (body as { data: T }).data;
}

export const api = {
  listSlots: () => request<SlotView[]>("/slots"),
  createSlot: (input: CreateSlotInput) =>
    request<Slot>("/slots", { method: "POST", body: JSON.stringify(input) }),
  deleteSlot: (id: number, requesterId: string) =>
    request<void>(`/slots/${id}`, { method: "DELETE", body: JSON.stringify({ requesterId }) }),
  book: (slotId: number, userId: string) =>
    request<Booking>(`/slots/${slotId}/book`, { method: "POST", body: JSON.stringify({ userId }) }),
  cancel: (bookingId: number) =>
    request<void>(`/bookings/${bookingId}/cancel`, { method: "POST" }),
};
