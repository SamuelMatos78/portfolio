import { useLocale } from "../../i18n/useLocale";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useScenes } from "../../runtime/useScenes";
import "./PowerTerminal.css";
import LanguageSwitch from "../LanguageSwitch";
import { scenePath } from "../../runtime/scenes";
import { normalizeCommand } from "../../runtime/commandLanguage";

interface Entry { command: string; message: string; error: boolean; path: string }

function Prompt({ path }: { path: string }) {
    return <span className="terminal-prompt"><span>guest@samuel-world</span><span className="terminal-prompt__separator">:</span><span className="terminal-prompt__path">{path}</span><span className="terminal-prompt__separator">$</span></span>;
}

export default function PowerTerminal() {
    const { state, executeCommand, completions } = useScenes();
    const { t, locale } = useLocale();
    const [input, setInput] = useState("");
    const [entries, setEntries] = useState<Entry[]>([]);
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState<number | null>(null);
    const [draft, setDraft] = useState("");
    const [busy, setBusy] = useState(false);
    const [maximized, setMaximized] = useState(false);
    const [welcomeVisible, setWelcomeVisible] = useState(true);
    const path = scenePath(state.currentScene);
    const inputRef = useRef<HTMLInputElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const logRef = useRef<HTMLDivElement>(null);
    const matches = input.trim() ? completions.filter((command) => normalizeCommand(command).startsWith(normalizeCommand(input))) : [];

    useEffect(() => {
        if (!state.terminalOpen) return;
        const previousFocus = document.activeElement as HTMLElement | null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        inputRef.current?.focus();
        function handleKey(event: globalThis.KeyboardEvent) {
            if (event.key === "Escape") {
                event.preventDefault();
                void executeCommand("close terminal");
            }
            if (event.key !== "Tab" || event.defaultPrevented) return;
            const focusable = panelRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled)");
            if (!focusable?.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
        document.addEventListener("keydown", handleKey);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleKey);
            if (previousFocus?.isConnected) previousFocus.focus();
            else document.getElementById("terminal-trigger")?.focus();
        };
    }, [state.terminalOpen, executeCommand]);

    useEffect(() => {
        if (state.terminalOpen && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, [entries, state.terminalOpen]);

    async function run(command: string) {
        if (!command || busy) return;
        setInput(""); setHistoryIndex(null); setDraft(""); setBusy(true);
        setHistory((history) => [...history, command].slice(-100));
        try {
            const result = await executeCommand(command);
            if (result.kind === "clear") { setEntries([]); setWelcomeVisible(false); }
            else setEntries((entries) => [...entries, { command, message: result.message, error: result.kind === "error", path }].slice(-200));
        } finally { setBusy(false); }
    }

    function handleInputKey(event: KeyboardEvent<HTMLInputElement>) {
        if (event.ctrlKey && event.key.toLowerCase() === "l") { event.preventDefault(); void run("clear"); }
        if (event.key === "Tab" && !event.shiftKey && matches.length) {
            event.preventDefault(); setInput(matches[0]);
        }
        if (event.key === "ArrowUp" && history.length) {
            event.preventDefault();
            if (historyIndex === null) setDraft(input);
            const next = historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
            setHistoryIndex(next); setInput(history[next]);
        }
        if (event.key === "ArrowDown" && historyIndex !== null) {
            event.preventDefault();
            const next = historyIndex + 1;
            if (next >= history.length) { setHistoryIndex(null); setInput(draft); }
            else { setHistoryIndex(next); setInput(history[next]); }
        }
    }

    if (!state.terminalOpen) return null;
    return <div className="terminal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) void executeCommand("close terminal"); }}>
        <div id="power-terminal" ref={panelRef} className={`power-terminal ${maximized ? "power-terminal--maximized" : ""}`} role="dialog" aria-modal="true" aria-labelledby="terminal-title" aria-describedby="terminal-hint">
            <header className="power-terminal__header"><h2 id="terminal-title">{t("terminal")} <span>— guest@samuel-world: {path}</span></h2>
                <div className="power-terminal__window-controls"><LanguageSwitch />
                    <button type="button" onClick={() => void executeCommand("close terminal")} aria-label={t("minimizeTerminal")} title={t("minimizeTerminal")}>−</button>
                    <button type="button" onClick={() => setMaximized((value) => !value)} aria-label={t("maximizeTerminal")} aria-pressed={maximized} title={t("maximizeTerminal")}>□</button>
                    <button className="power-terminal__close" type="button" onClick={() => void executeCommand("close terminal")} aria-label={t("closeTerminal")} title={t("closeTerminal")}>×</button>
                </div>
            </header>
            <div className="power-terminal__toolbar"><p id="terminal-hint">{t("shellNavigation")}</p><button type="button" disabled={busy} onClick={() => void run(locale === "pt" ? "ajuda" : "help")}>{locale === "pt" ? "ajuda" : "help"}</button><button type="button" disabled={busy} onClick={() => void run("ls")}>ls</button></div>
            <div className="power-terminal__log" ref={logRef} role="log" aria-live="polite" aria-relevant="additions" aria-label={t("commandHistory")}>
                {welcomeVisible && <p className="terminal-welcome">{t("terminalWelcome")}</p>}
                {entries.map((entry, index) => <div key={index} className={entry.error ? "terminal-entry terminal-entry--error" : "terminal-entry"}>
                    <p className="terminal-entry__command"><Prompt path={entry.path} /> {entry.command}</p><pre>{entry.message}</pre>
                </div>)}
            </div>
            <form className="power-terminal__form" onSubmit={(event) => { event.preventDefault(); void run(input.trim()); }}>
                <label htmlFor="terminal-input" className="sr-only">{t("command")}</label><span aria-hidden="true"><Prompt path={path} /></span>
                <input ref={inputRef} id="terminal-input" value={input} onChange={(event) => { setInput(event.target.value); setHistoryIndex(null); }} onKeyDown={handleInputKey}
                    autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder={t("commandPlaceholder")} aria-describedby="terminal-completions" readOnly={busy} />
                <button type="submit" disabled={busy || !input.trim()}>{busy ? t("running") : t("enter")}</button>
            </form>
            <div id="terminal-completions" className="power-terminal__completions">{matches.slice(0, 4).join(" · ") || t("waiting")}</div>
        </div>
    </div>;
}
