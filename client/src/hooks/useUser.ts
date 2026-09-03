import { useState } from "react";

const KEY = "rbb_user";

export function useUser() {
  const [user, setUserState] = useState(() => localStorage.getItem(KEY) ?? "");
  const setUser = (name: string) => {
    localStorage.setItem(KEY, name);
    setUserState(name);
  };
  return { user, setUser };
}
