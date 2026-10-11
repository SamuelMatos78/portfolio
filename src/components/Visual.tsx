import { useLocale } from "../i18n/useLocale";
import { useState } from "react";

// Reserved geometry also remains when an image is missing or fails to load.
export default function Visual({ src, alt = "", label, className = "" }: {
  src?: string; alt?: string; label: string; className?: string;
}) {
  const { t } = useLocale();
  const [failedSource, setFailedSource] = useState<string | undefined>();
  return <div className={`visual ${className}`}>
    {src && failedSource !== src
      ? <img src={src} alt={alt} width="960" height="600" loading="lazy" decoding="async" onError={() => setFailedSource(src)} />
      : <div className="visual__fallback" aria-hidden="true"><span>{label.slice(0, 2).toUpperCase()}</span><small>{t("visualPlaceholder")}</small></div>}
  </div>;
}
