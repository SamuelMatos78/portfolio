import { useEffect, useRef } from "react";
import type { PointerEvent, RefObject } from "react";

export function useCardMotion(ref: RefObject<HTMLElement | null>, enabled: boolean) {
  const frame = useRef<number | undefined>(undefined);
  const bounds = useRef<DOMRect | undefined>(undefined);
  const reset = () => {
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    frame.current = undefined;
    bounds.current = undefined;
    ref.current?.style.removeProperty("--tilt-x");
    ref.current?.style.removeProperty("--tilt-y");
    ref.current?.style.removeProperty("--pointer-x");
    ref.current?.style.removeProperty("--pointer-y");
  };
  useEffect(() => () => { if (frame.current !== undefined) cancelAnimationFrame(frame.current); }, []);
  const move = (event: PointerEvent<HTMLElement>) => {
    if (!enabled || event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    bounds.current ??= event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - bounds.current.left) / bounds.current.width));
    const y = Math.max(0, Math.min(1, (event.clientY - bounds.current.top) / bounds.current.height));
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      ref.current?.style.setProperty("--tilt-x", `${(0.5 - y) * 5}deg`);
      ref.current?.style.setProperty("--tilt-y", `${(x - 0.5) * 5}deg`);
      ref.current?.style.setProperty("--pointer-x", `${x * 100}%`);
      ref.current?.style.setProperty("--pointer-y", `${y * 100}%`);
    });
  };
  return { move, reset };
}
