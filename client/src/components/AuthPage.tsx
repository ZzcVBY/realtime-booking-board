import { useState } from "react";

interface Props {
  onLogin: (username: string, password: string) => Promise<unknown>;
  onRegister: (username: string, password: string) => Promise<unknown>;
}

export function AuthPage({ onLogin, onRegister }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") await onLogin(username, password);
      else await onRegister(username, password);
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "操作失败";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/70 p-8">
        <h1 className="text-xl font-bold text-slate-100">实时协同预约排班看板</h1>
        <p className="mt-1 text-sm text-slate-400">登录后可新建 / 预约 / 取消排班</p>

        <div className="mt-6 flex rounded-lg bg-slate-800 p-1 text-sm">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-md py-1.5 ${mode === "login" ? "bg-slate-950 text-slate-100" : "text-slate-400"}`}
          >
            登录
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 rounded-md py-1.5 ${mode === "register" ? "bg-slate-950 text-slate-100" : "text-slate-400"}`}
          >
            注册
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm text-slate-400">
            用户名
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
              autoComplete="username"
              required
            />
          </label>
          <label className="block text-sm text-slate-400">
            密码
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
          </label>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-emerald-500 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            {busy ? "提交中…" : mode === "login" ? "登录" : "注册并登录"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          {mode === "login" ? "没有账号？切换" : "已有账号？切换"}到{mode === "login" ? "注册" : "登录"}
        </p>
      </div>
    </div>
  );
}
