import { useCallback, useEffect, useState } from "react";
import {
  authApi,
  clearToken,
  clearRefreshToken,
  clearUser,
  getRefreshToken,
  getToken,
  getUser,
  isAuthError,
  setRefreshToken,
  setToken,
  setUser,
} from "../lib/api";
import type { AuthUser } from "../types";

/**
 * 登录态管理：token 持久化在 localStorage，发起时先 /me 校验有效性。
 * 未登录或 token 失效时 auth 为 null，App 据此切到登录页。
 */
export function useAuth() {
  // 先从本地缓存同步恢复登录态（刷新不闪登录页），避免在 effect 里同步 setState
  const [auth, setAuth] = useState<AuthUser | null>(() => {
    const token = getToken();
    const cached = getUser();
    return token && cached ? { id: cached.id, username: cached.username, token } : null;
  });
  const [loading, setLoading] = useState(() => !!getToken() && !getUser());

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    // 后台用 /me 校验；只有"鉴权失败"才登出，网络抖动保留登录态
    authApi
      .me()
      .then((user) => {
        setUser({ id: user.id, username: user.username });
        setAuth({ id: user.id, username: user.username, token: getToken()! });
      })
      .catch((err) => {
        if (isAuthError(err)) {
          clearToken();
          clearRefreshToken();
          clearUser();
          setAuth(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await authApi.login(username, password);
    setToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setUser({ id: data.user.id, username: data.user.username });
    setAuth({ id: data.user.id, username: data.user.username, token: data.accessToken });
    return data;
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const data = await authApi.register(username, password);
    setToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setUser({ id: data.user.id, username: data.user.username });
    setAuth({ id: data.user.id, username: data.user.username, token: data.accessToken });
    return data;
  }, []);

  const logout = useCallback(async () => {
    const rt = getRefreshToken();
    if (rt) {
      try {
        await authApi.logout(rt);
      } catch {
        // 即使撤销失败也本地登出
      }
    }
    clearToken();
    clearRefreshToken();
    clearUser();
    setAuth(null);
  }, []);

  return { auth, loading, login, register, logout };
}
