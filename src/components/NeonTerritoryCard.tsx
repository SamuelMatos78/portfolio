import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import "./NeonTerritoryCard.css";

export type NeonTerritoryVariant = "generals" | "projects" | "initiatives";

interface Props {
  variant: NeonTerritoryVariant;
  command?: string;
  onSelect: () => void;
  onWarm?: () => void;
  sectorLabel: string;
  statusLabel: string;
  enterLabel: string;
  label: string;
  description: string;
  symbol: string;
  icon?: ReactNode;
  actionIcon?: ReactNode;
  residents: string[];
  index?: number;
  onActivate?: (element: HTMLButtonElement) => void;
  onDeactivate?: () => void;
}

export default function NeonTerritoryCard({
  variant,
  command,
  onSelect,
  onWarm,
  sectorLabel,
  statusLabel,
  enterLabel,
  label,
  description,
  symbol,
  icon,
  actionIcon,
  residents,
  index = 0,
  onActivate,
  onDeactivate,
}: Props) {
  const entryRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  const maxTilt = useRef(0);

  useEffect(() => {
    const entry = entryRef.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (entry) {
      const styles = window.getComputedStyle(entry);
      const tilt = Number.parseFloat(styles.getPropertyValue("--territory-tilt-max"));
      const stagger = Number.parseFloat(styles.getPropertyValue("--territory-reveal-stagger"));
      if (Number.isFinite(tilt)) maxTilt.current = tilt;
      if (Number.isFinite(stagger)) entry.style.setProperty("--reveal-delay", `${Math.min(index, 2) * stagger}ms`);
    }
    if (!entry || reduceMotion.matches || !("IntersectionObserver" in window)) {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(([observation]) => {
      if (!observation.isIntersecting) return;
      setRevealed(true);
      observer.unobserve(observation.target);
    }, { threshold: 0.16, rootMargin: "0px 0px -32px 0px" });

    observer.observe(entry);
    return () => observer.disconnect();
  }, [index]);

  function moveLight(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    const y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
    const tilt = maxTilt.current;
    event.currentTarget.style.setProperty("--pointer-x", `${(x * 100).toFixed(1)}%`);
    event.currentTarget.style.setProperty("--pointer-y", `${(y * 100).toFixed(1)}%`);
    event.currentTarget.style.setProperty("--tilt-x", `${((0.5 - y) * 2 * tilt).toFixed(2)}deg`);
    event.currentTarget.style.setProperty("--tilt-y", `${((x - 0.5) * 2 * tilt).toFixed(2)}deg`);
  }

  function resetLight(event: ReactPointerEvent<HTMLButtonElement>) {
    event.currentTarget.style.setProperty("--pointer-x", "50%");
    event.currentTarget.style.setProperty("--pointer-y", "50%");
    event.currentTarget.style.setProperty("--tilt-x", "0deg");
    event.currentTarget.style.setProperty("--tilt-y", "0deg");
    if (!event.currentTarget.matches(":focus-visible")) onDeactivate?.();
  }

  return <div ref={entryRef} className="neon-territory-card__entry" data-revealed={revealed}>
    <button
      type="button"
      className="neon-territory-card"
      data-command={command}
      data-variant={variant}
      onClick={onSelect}
      onPointerEnter={(event) => { onActivate?.(event.currentTarget); onWarm?.(); }}
      onPointerMove={moveLight}
      onPointerLeave={resetLight}
      onFocus={(event) => { onActivate?.(event.currentTarget); onWarm?.(); }}
      onBlur={() => onDeactivate?.()}
    >
      <span className="neon-territory-card__texture" aria-hidden="true" />
      <span className="neon-territory-card__topline" aria-hidden="true">
        <span>{sectorLabel}</span><span className="neon-territory-card__status">{statusLabel}</span>
      </span>
      <span className="neon-territory-card__emblem" aria-hidden="true">
        {icon ?? symbol}
        <span className="neon-territory-card__rune">{symbol}</span>
      </span>
      <span className="neon-territory-card__title">{label}</span>
      <span className="neon-territory-card__description">{description}</span>
      <span className="neon-territory-card__footer">
        <span className="neon-territory-card__residents">{residents.length ? residents.join(" · ") : "—"}</span>
        <span className="neon-territory-card__enter"><span>{enterLabel}</span>{actionIcon}</span>
      </span>
    </button>
  </div>;
}
