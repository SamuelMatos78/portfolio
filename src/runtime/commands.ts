import type { SceneAction, SceneLocation } from "./scenes";
import aliases from "../data/commands.json" with { type: "json" };
import { translate } from "../i18n/messages.ts";
import type { Locale } from "../i18n/types";
import { destinationName, normalizeCommand, travelVerbs } from "./commandLanguage.ts";

type Command =
  | { type: "tp"; destination: string }
  | { type: "terminal"; open: boolean }
  | { type: "help" | "clear" | "back" | "list" | "pwd" };

export interface CommandResult {
  kind: "success" | "error" | "clear";
  message: string;
}

const commandHelp = [
  ["tp / teleportar / teletransportar / ir / go / cd <id>", "helpTeleport"],
  ["ls / listar", "helpList"],
  ["pwd / onde", "helpPwd"],
  ["back", "helpBack"],
  ["open terminal / close terminal", "helpTerminal"],
  ["help", "helpHelp"],
  ["clear", "helpClear"],
] as const;

export function interpretCommand(input: string, locale: Locale = "en"): Command {
  const entered = normalizeCommand(input);
  const normalized = aliases.find((alias) => normalizeCommand(alias.command) === entered)?.target ?? entered;
  if (["help", "clear", "back", "list", "pwd"].includes(normalized)) {
    return { type: normalized as "help" | "clear" | "back" | "list" | "pwd" };
  }
  if (normalized === "open terminal" || normalized === "close terminal") {
    return { type: "terminal", open: normalized === "open terminal" };
  }
  const [verb, ...arguments_] = normalized.split(" ");
  if (verb === "cd" && !arguments_.length) return { type: "tp", destination: "home" };
  if (travelVerbs.some((item) => item === verb) && arguments_.length) {
    const argument = arguments_.join(" ").replace(/^(?:para|to) /, "");
    if (verb === "cd" && argument === "..") return { type: "back" };
    return { type: "tp", destination: destinationName(argument) };
  }
  throw new Error(travelVerbs.some((item) => item === verb)
    ? translate(locale, "usage")
    : translate(locale, "unknownCommand", { value: input.trim() || translate(locale, "empty") }));
}

export type NavigationMode = "push" | "replace";

interface CommandHandlers {
  dispatch: (action: SceneAction, mode?: NavigationMode) => void;
  resolveDestination: (id: string) => Promise<SceneLocation | undefined>;
  listDestinations: () => Promise<string[]>;
  currentPath?: () => string;
}

export function createCommandBus(handlers: CommandHandlers) {
  let navigationIntent = 0;
  return {
    async execute(input: string, locale: Locale = "en", currentPath?: string, options?: { history: NavigationMode }): Promise<CommandResult> {
      const t = (key: Parameters<typeof translate>[1], value?: string) => translate(locale, key, value === undefined ? {} : { value });
      try {
        const command = interpretCommand(input, locale);
        switch (command.type) {
          case "tp": {
            const intent = ++navigationIntent;
            const destination = await handlers.resolveDestination(command.destination);
            if (intent !== navigationIntent) return { kind: "success", message: t("newerNavigation") };
            if (!destination) throw new Error(t("unknownDestination", command.destination));
            handlers.dispatch({ type: "navigate", destination }, options?.history);
            return { kind: "success", message: t("destination", command.destination) };
          }
          case "back":
            navigationIntent++;
            handlers.dispatch({ type: "back" }, options?.history);
            return { kind: "success", message: t("backRequested") };
          case "terminal":
            handlers.dispatch({ type: "terminal", open: command.open });
            return { kind: "success", message: t(command.open ? "terminalOpened" : "terminalClosed") };
          case "clear": return { kind: "clear", message: "" };
          case "pwd": return { kind: "success", message: currentPath ?? handlers.currentPath?.() ?? "~/home" };
          case "list": return { kind: "success", message: `${t("destinations")}:\n${(await handlers.listDestinations()).map((id) => `  ${id}/`).join("\n")}` };
          case "help": {
            let destinations: string[];
            let catalogNote = "";
            try { destinations = await handlers.listDestinations(); }
            catch {
              destinations = ["home", "projects", "champions"];
              catalogNote = `\n${t("catalogHelpUnavailable")}`;
            }
            return {
              kind: "success",
              message: `${commandHelp.map(([name, key]) => `${name}\n  ${t(key)}`).join("\n")}\n\n${t("aliases")}:\n${aliases.map((alias) => `${alias.command.padEnd(20)} → ${alias.target}`).join("\n")}\n\n${t("destinations")}: ${destinations.join(", ")}${catalogNote}`,
            };
          }
        }
      } catch (error) {
        return { kind: "error", message: error instanceof Error ? error.message : t("commandFailed") };
      }
    },
  };
}

export function commandCompletions(destinations: string[]): string[] {
  const names = [...new Set([...destinations, ...aliases.filter((alias) => alias.target.startsWith("tp ")).map((alias) => alias.command)])];
  return [...new Set(["help", "clear", "back", "ls", "pwd", "cd ..", "open terminal", "close terminal", ...aliases.map((alias) => alias.command),
    ...travelVerbs.flatMap((verb) => names.map((destination) => `${verb} ${destination}`))])];
}
