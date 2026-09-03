import { useCallback, useEffect, useState } from "react";
import { authApi, clearToken, getToken, setToken } from "../lib/api";
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
    setToken(data.token);
    setAuth({ id: data.user.id, username: data.user.username, token: data.token });
    return data;
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const data = await authApi.register(username, password);
    setToken(data.token);
    setAuth({ id: data.user.id, username: data.user.username, token: data.token });
    return data;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setAuth(null);
  }, []);

  return { auth, loading, login, register, logout };
}
