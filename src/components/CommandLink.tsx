import type { AnchorHTMLAttributes } from "react";
import { commandHref } from "../runtime/links";
import { useScenes } from "../runtime/useScenes";

interface Props extends AnchorHTMLAttributes<HTMLAnchorElement> { command: string }

export default function CommandLink({ command, children, ...props }: Props) {
  const { executeCommand, prefetchCommand } = useScenes();
  const isBrand = props.className?.split(/\s+/).includes("domain-brand");
  const className = ["command-link", props.className, isBrand ? "" : "pixel-font"].filter(Boolean).join(" ");
  return <a {...props} href={commandHref(command)} data-command={command} className={className}
    onClick={(event) => {
      props.onClick?.(event);
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || (props.target && props.target !== "_self") || props.download) return;
      event.preventDefault();
      void executeCommand(command);
    }}
    onPointerEnter={(event) => { props.onPointerEnter?.(event); prefetchCommand(command); }}
    onFocus={(event) => { props.onFocus?.(event); prefetchCommand(command); }}>{children}</a>;
}
