import { useState } from "react";
import { useLocale } from "../i18n/useLocale";
import type { ProfileData } from "./types";

const photos = import.meta.glob<string>("../assets/*.{jpeg,jpg,png,webp,avif}", { eager: true, query: "?url", import: "default" });

export default function ProfilePortrait({ photo, name }: { photo: NonNullable<ProfileData["photo"]>; name: string }) {
  const { text } = useLocale();
  const [failedSource, setFailedSource] = useState<string>();
  const src = photos[`../assets/${photo.src}`];
  return <figure className="profile-portrait">
    {src && failedSource !== src ? <img src={src} alt={text(photo.alt)} width="1200" height="1600" loading="lazy" decoding="async" style={{ objectPosition: photo.position ?? "center" }} onError={() => setFailedSource(src)} /> : <span className="profile-portrait__fallback" aria-hidden="true">{name.split(" ").map((word) => word[0]).slice(0, 2).join("")}</span>}
    <figcaption>{name}</figcaption>
  </figure>;
}
