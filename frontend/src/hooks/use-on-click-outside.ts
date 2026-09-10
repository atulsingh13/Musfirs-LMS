import { useEffect, type RefObject } from "react";

/** Calls `handler` on pointerdown outside `ref`. */
export function useOnClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: MouseEvent | TouchEvent) => void
) {
  useEffect(() => {
    function onPointerDown(event: MouseEvent | TouchEvent) {
      const node = ref.current;
      if (!node) return;
      const target = event.target as Node | null;
      if (target && node.contains(target)) return;
      handler(event);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [ref, handler]);
}

export default useOnClickOutside;
