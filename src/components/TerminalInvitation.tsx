import { useEffect, useState } from "react";
import { useLocale } from "../i18n/useLocale";
import CommandButton from "./CommandButton";
import Icon from "./Icon";
import "./TerminalInvitation.css";

type Phase = "waiting" | "visible" | "leaving" | "dismissed";
const sessionKey = "portfolio.terminal-invitation";
function initialPhase(): Phase {
  try { return sessionStorage.getItem(sessionKey) === "seen" ? "dismissed" : "waiting"; }
  catch { return "waiting"; }
}

export default function TerminalInvitation() {
  const { t } = useLocale();
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;
  useEffect(() => {
    if (phase === "dismissed" || (phase === "visible" && paused)) return;
    if (phase === "waiting") {
      try { sessionStorage.setItem(sessionKey, "seen"); } catch { /* Works when storage is disabled. */ }
    }
    const duration = phase === "waiting" ? 1200 : phase === "visible" ? 6500 : 400;
    const timer = window.setTimeout(() => setPhase(phase === "waiting" ? "visible" : phase === "visible" ? "leaving" : "dismissed"), duration);
    return () => window.clearTimeout(timer);
  }, [phase, paused]);
  const dismiss = () => {
    setPhase("dismissed");
    document.getElementById("terminal-trigger")?.focus({ preventScroll: true });
  };
  return <><span className="sr-only" role="status" aria-live="polite">{phase === "visible" ? t("terminalInvitation") : ""}</span>
  {phase !== "waiting" && phase !== "dismissed" && <aside className={`terminal-invitation terminal-invitation--${phase}`} aria-label={t("terminalInvitationTitle")} inert={phase === "leaving"}
    onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <div className="terminal-invitation__header"><span><Icon name="terminal" /> {t("terminalInvitationTitle")}</span><button type="button" onClick={dismiss} aria-label={t("dismissInvitation")}>×</button></div>
    <p>{t("terminalInvitation")}</p>
    <div className="terminal-invitation__actions"><code><span aria-hidden="true">$ </span>{t("commandExample")}</code><CommandButton command="open terminal" onClick={dismiss}>{t("tryTerminal")} <Icon name="arrow-up-right" /></CommandButton></div>
  </aside>}</>;
}
