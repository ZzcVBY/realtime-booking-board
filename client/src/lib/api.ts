import type { AuthData, Booking, CreateSlotInput, Slot, SlotView, User } from "../types";

const BASE = "/api";
const TOKEN_KEY = "rbb_token";
const REFRESH_KEY = "rbb_refresh";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}
export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_KEY, token);
}
export function clearRefreshToken(): void {
  localStorage.removeItem(REFRESH_KEY);
}

/** access 过期时用它换新；缓存并发请求以便多个 401 同时只刷新一次 */
let refreshPromise: Promise<AuthData> | null = null;

async function refreshSession(): Promise<AuthData> {
  const rt = getRefreshToken();
  if (!rt) throw new Error("no-refresh-token");
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: rt }),
  });
  const body = await res.json();
  if (!res.ok) {
    clearToken();
    clearRefreshToken();
    throw body;
  }
  setToken(body.data.accessToken);
  setRefreshToken(body.data.refreshToken);
  return body.data;
}

/** 统一包装 fetch：自动带 Authorization；401 时刷新一次并重试 */
async function request<T>(path: string, init?: RequestInit, retried = false): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 401 && !retried) {
    try {
      refreshPromise ??= refreshSession().finally(() => {
        refreshPromise = null;
      });
      await refreshPromise;
      return request<T>(path, init, true);
    } catch (err) {
      throw err;
    }
  }
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
  logout: (refreshToken: string) =>
    request<void>("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }),
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
