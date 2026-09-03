import { useCallback, useEffect, useState } from "react";
import {
  authApi,
  clearToken,
  clearRefreshToken,
  getRefreshToken,
  getToken,
  setRefreshToken,
  setToken,
} from "../lib/api";
import type { AuthUser } from "../types";

/**
 * 登录态管理：token 持久化在 localStorage，发起时先 /me 校验有效性。
 * 未登录或 token 失效时 auth 为 null，App 据此切到登录页。
 */
export function useAuth() {
  const [auth, setAuth] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(() => !!getToken());

  useEffect(() => {
    if (!getToken()) return;
    authApi
      .me()
      .then((user) => setAuth({ id: user.id, username: user.username, token: getToken()! }))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await authApi.login(username, password);
    setToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setAuth({ id: data.user.id, username: data.user.username, token: data.accessToken });
    return data;
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const data = await authApi.register(username, password);
    setToken(data.accessToken);
    setRefreshToken(data.refreshToken);
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
    setAuth(null);
  }, []);

  return { auth, loading, login, register, logout };
}
