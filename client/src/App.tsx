import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Board } from "./pages/Board";
import { AuthPage } from "./components/AuthPage";
import { useAuth } from "./hooks/useAuth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Gate />
    </QueryClientProvider>
  );
}

function Gate() {
  const { auth, loading, login, register, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        正在校验登录态…
      </div>
    );
  }
  if (!auth) return <AuthPage onLogin={login} onRegister={register} />;
  return <Board auth={auth} onLogout={logout} />;
}
