import type { AuthData, Booking, CreateSlotInput, Slot, SlotView, User } from "../types";

const BASE = "/api";
const TOKEN_KEY = "rbb_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** 统一包装 fetch：自动带 Authorization，非 2xx 抛结构化错误 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json();
  if (!res.ok) throw body;
  return (body as { data: T }).data;
}

export const authApi = {
  register: (username: string, password: string) =>
    request<AuthData>("/auth/register", { method: "POST", body: JSON.stringify({ username, password }) }),
  login: (username: string, password: string) =>
    request<AuthData>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  me: () => request<User>("/auth/me"),
};

export const api = {
  listSlots: () => request<SlotView[]>("/slots"),
  createSlot: (input: CreateSlotInput) =>
    request<Slot>("/slots", { method: "POST", body: JSON.stringify(input) }),
  deleteSlot: (id: number) => request<void>(`/slots/${id}`, { method: "DELETE" }),
  book: (slotId: number) =>
    request<Booking>(`/slots/${slotId}/book`, { method: "POST" }),
  cancel: (bookingId: number) =>
    request<void>(`/bookings/${bookingId}/cancel`, { method: "POST" }),
};
