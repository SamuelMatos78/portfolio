import type { CSSProperties } from "react";

// Dropping a licensed SVG here makes it available by filename in content JSON.
const assets = import.meta.glob<string>("../assets/icons/*.svg", { eager: true, query: "?url", import: "default" });

export default function Icon({ name, className = "" }: { name: string; className?: string }) {
  const source = assets[`../assets/icons/${name}.svg`] ?? assets["../assets/icons/compass.svg"];
  return <span aria-hidden="true" className={`icon ${className}`} style={{ "--icon-source": `url("${source}")` } as CSSProperties} />;
}
