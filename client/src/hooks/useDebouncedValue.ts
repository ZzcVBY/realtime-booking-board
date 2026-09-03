import { useEffect, useState } from "react";

/** 防抖：把高频变化的值延迟暴露，用于搜索框（避免每次按键都触发过滤/请求） */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
