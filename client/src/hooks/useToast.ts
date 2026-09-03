import { useCallback, useState } from "react";

export interface Toast {
  id: number;
  level: "info" | "error" | "success";
  text: string;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((text: string, level: Toast["level"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, level, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  return { toasts, push };
}
