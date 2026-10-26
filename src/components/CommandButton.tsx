import type { ButtonHTMLAttributes } from "react";
import { useScenes } from "../runtime/useScenes";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> { command: string }

export default function CommandButton({ command, children, ...props }: Props) {
  const { executeCommand, prefetchCommand } = useScenes();
  const className = props.className ?? "";
  const isContentCard = /(?:^|\s)(?:home-path|category-card|resume-project)(?:\s|$)/.test(className);
  const buttonClassName = [className, isContentCard ? "" : "pixel-font"].filter(Boolean).join(" ");
  return <button {...props} className={buttonClassName} type="button" data-command={command}
    onClick={(event) => { props.onClick?.(event); if (!event.defaultPrevented) void executeCommand(command); }}
    onPointerEnter={(event) => { props.onPointerEnter?.(event); prefetchCommand(command); }}
    onFocus={(event) => { props.onFocus?.(event); prefetchCommand(command); }}>
    {children}
  </button>;
}
