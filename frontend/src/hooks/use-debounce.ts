import { useEffect, useState } from "react";

/** Returns `value` only after it has been stable for `delayMs` milliseconds. */
export function useDebounce<T>(value: T, delayMs = 600): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export default useDebounce;
