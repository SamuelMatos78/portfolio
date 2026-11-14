import { useEffect, useState } from "react";
import { useLocale } from "../i18n/useLocale";
import type { ProjectSection } from "../types/project";

type DownloadSectionData = Extract<ProjectSection, { type: "downloads" }>;
interface ReleaseData { counts: Map<string, number>; urls: Map<string, string>; ready: boolean; error: boolean }

async function fetchReleaseData(repository: string, items: DownloadSectionData["items"], signal: AbortSignal): Promise<ReleaseData> {
  const path = repository.split("/").map(encodeURIComponent).join("/");
  const trackedNames = new Set(items.map((item) => item.fileName));
  const counts = new Map<string, number>();
  const urls = new Map<string, string>();
  let page = 1;
  while (page <= 20) {
    const response = await fetch(`https://api.github.com/repos/${path}/releases?per_page=100&page=${page}`, {
      headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      signal,
    });
    if (!response.ok) throw new Error(`GitHub API ${response.status}`);
    const releases: Array<{ assets?: Array<{ name: string; download_count: number; browser_download_url: string }> }> = await response.json();
    if (!Array.isArray(releases)) throw new Error("Resposta de releases inválida.");
    for (const release of releases) {
      for (const asset of release.assets ?? []) {
        if (!trackedNames.has(asset.name)) continue;
        counts.set(asset.name, (counts.get(asset.name) ?? 0) + Math.max(0, Number(asset.download_count) || 0));
        if (!urls.has(asset.name) && /^https:\/\/github\.com\//.test(asset.browser_download_url)) urls.set(asset.name, asset.browser_download_url);
      }
    }
    if (releases.length < 100) break;
    page += 1;
  }
  return { counts, urls, ready: items.every((item) => urls.has(item.fileName)), error: false };
}

export default function DownloadSection({ section }: { section: DownloadSectionData }) {
  const { locale, text } = useLocale();
  const [data, setData] = useState<ReleaseData | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    void fetchReleaseData(section.repository, section.items, controller.signal)
      .then(setData)
      .catch(() => {
        if (!controller.signal.aborted) setData({ counts: new Map(), urls: new Map(), ready: false, error: true });
      });
    return () => controller.abort();
  }, [section.repository, section.items]);

  const number = new Intl.NumberFormat(locale === "pt" ? "pt-BR" : "en-US");
  const allCounted = data?.ready === true;
  const total = allCounted ? section.items.reduce((sum, item) => sum + (data?.counts.get(item.fileName) ?? 0), 0) : null;
  const status = !data
    ? locale === "pt" ? "Consultando a contagem oficial de downloads…" : "Checking the official download count…"
    : data.error
      ? locale === "pt" ? "Não foi possível consultar o GitHub agora. Os downloads diretos continuam disponíveis." : "GitHub could not be reached right now. Direct downloads remain available."
      : allCounted
        ? locale === "pt" ? "Soma dos downloads registrados nos arquivos de todas as Releases. O GitHub conta transferências, não pessoas únicas." : "Sum of downloads registered for these files across releases. GitHub counts transfers, not unique people."
        : locale === "pt" ? "Ainda não há uma Release do GitHub com estes executáveis. Os arquivos abaixo estão disponíveis neste site; esses downloads diretos não entram na contagem." : "There is no GitHub release with these executables yet. The files below are available on this site; direct downloads are not included in the count.";

  return <section className="experience-section download-section" aria-labelledby="canvas-downloads-title">
    <div className="download-section__heading">
      <div><p className="eyebrow">{locale === "pt" ? "APLICATIVO · WINDOWS E LINUX" : "DESKTOP APP · WINDOWS AND LINUX"}</p><h2 id="canvas-downloads-title">{text(section.title)}</h2></div>
      <div className="download-section__total" aria-live="polite">
        <strong>{total === null ? "—" : number.format(total)}</strong>
        <span>{locale === "pt" ? "downloads registrados" : "recorded downloads"}</span>
      </div>
    </div>
    <p className="download-section__description">{text(section.body)}</p>
    <p className="download-section__status" role="status">{status}</p>
    <div className="download-section__actions">
      {section.items.map((item) => {
        const href = data?.urls.get(item.fileName) ?? item.fallbackUrl;
        const trackedCount = data?.counts.has(item.fileName) ? data.counts.get(item.fileName) : null;
        const isLocal = href === item.fallbackUrl;
        return <a className={`download-button download-button--${item.platform}`} key={item.platform} href={href}
          download={isLocal ? item.fileName : undefined} aria-label={text(item.label)}>
          <span className="download-button__title">{text(item.label)}</span>
          <span className="download-button__note">{item.note ? text(item.note) : item.fileName}</span>
          <span className="download-button__count">{trackedCount == null
            ? (locale === "pt" ? "Download direto" : "Direct download")
            : `${number.format(trackedCount)} ${locale === "pt" ? "downloads" : "downloads"}`}</span>
        </a>;
      })}
      <a className="download-button download-button--source" href={section.repositoryUrl} target="_blank" rel="noopener noreferrer">
        <span className="download-button__title">{locale === "pt" ? "Ver código-fonte" : "View source code"}</span>
        <span className="download-button__note">GitHub · {section.repository}</span>
        <span className="download-button__count">{locale === "pt" ? "Abrir repositório ↗" : "Open repository ↗"}</span>
      </a>
    </div>
    <p className="download-section__attribution">{locale === "pt" ? "Contagem fornecida pela API oficial de Releases do GitHub." : "Counts come from the official GitHub Releases API."} <a href={`${section.repositoryUrl}/releases`} target="_blank" rel="noopener noreferrer">{locale === "pt" ? "Conferir versões ↗" : "View releases ↗"}</a></p>
  </section>;
}
