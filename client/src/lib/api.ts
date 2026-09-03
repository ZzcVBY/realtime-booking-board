import type { AuthData, Booking, CreateSlotInput, Slot, SlotView, User } from "../types";

const BASE = "/api";
const TOKEN_KEY = "rbb_token";
const REFRESH_KEY = "rbb_refresh";
const USER_KEY = "rbb_user";

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
export function getUser(): { id: number; username: string } | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { id: number; username: string };
  } catch {
    return null;
  }
}
export function setUser(user: { id: number; username: string }): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function clearUser(): void {
  localStorage.removeItem(USER_KEY);
}

/** 判断是否为"鉴权失败"类错误：仅这类才应该登出；网络抖动不算 */
export function isAuthError(e: unknown): boolean {
  if (e && typeof e === "object" && "code" in e) {
    const code = (e as { code: string }).code;
    return ["UNAUTHORIZED", "INVALID_REFRESH", "INVALID_CREDENTIALS", "USER_NOT_FOUND"].includes(code);
  }
  return false;
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
    refreshPromise ??= refreshSession().finally(() => {
      refreshPromise = null;
    });
    await refreshPromise;
    return request<T>(path, init, true);
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
