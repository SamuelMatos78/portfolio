import { useLocale } from "../i18n/useLocale";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ProjectSection } from "../types/project";
import Visual from "../components/Visual";
import DownloadSection from "./DownloadSection";
import CommandButton from "../components/CommandButton";

type GallerySectionData = Extract<ProjectSection, { type: "gallery" }>;

function GallerySection({ section }: { section: GallerySectionData }) {
  const { text, t } = useLocale();
  const [expandedImage, setExpandedImage] = useState<{ src: string; alt: string; caption: string } | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!expandedImage) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpandedImage(null);
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      openerRef.current?.focus();
    };
  }, [expandedImage]);

  return <>
    <section className="experience-section"><h2>{text(section.title)}</h2><div className="gallery-grid">
      {section.items.map((item, index) => {
        const image = item.image;
        const alt = text(item.alt);
        const caption = text(item.caption);
        return <figure key={index}>
          {image ? <button
              type="button"
              className="gallery-image-button"
              aria-label={`${t("expandImage")}: ${alt}`}
              onClick={(event) => {
                openerRef.current = event.currentTarget;
                setExpandedImage({ src: image, alt, caption });
              }}
            >
              <Visual src={image} alt={alt} label={alt} />
            </button>
            : <Visual alt={alt} label={alt} />}
          <figcaption>{caption}</figcaption>
        </figure>;
      })}
    </div></section>
    {expandedImage && createPortal(
      <div
        className="gallery-lightbox"
        role="dialog"
        aria-modal="true"
        aria-label={expandedImage.alt}
        onClick={(event) => {
          if (event.target === event.currentTarget) setExpandedImage(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Tab") {
            event.preventDefault();
            closeButtonRef.current?.focus();
          }
        }}
      >
        <div className="gallery-lightbox__content">
          <button ref={closeButtonRef} type="button" className="gallery-lightbox__close" aria-label={t("closeImage")} onClick={() => setExpandedImage(null)}>
            <span aria-hidden="true">×</span>
          </button>
          <img src={expandedImage.src} alt={expandedImage.alt} />
          <p>{expandedImage.caption}</p>
        </div>
      </div>,
      document.body,
    )}
  </>;
}

export default function SectionRenderer({ section }: { section: ProjectSection }) {
  const { text } = useLocale();
  switch (section.type) {
    case "hero": return <section className="experience-hero">
      <div><p className="eyebrow">{text(section.eyebrow)}</p><h2>{text(section.title)}</h2><p>{text(section.description)}</p></div>
      {section.image && <Visual src={section.image} label={text(section.title)} alt={text(section.title)} />}
    </section>;
    case "text": return <section className="experience-section"><h2>{text(section.title)}</h2><p className="experience-section__text">{text(section.body)}</p></section>;
    case "stats": return <section className="experience-section"><h2>{text(section.title)}</h2><dl className="stats-grid">
      {section.items.map((item, index) => <div className="stat" key={index}><dt>{text(item.label)}</dt><dd>{text(item.value)}</dd>{item.note && <p>{text(item.note)}</p>}</div>)}
    </dl></section>;
    case "gallery": return <GallerySection section={section} />;
    case "links": return <section className="experience-section"><h2>{text(section.title)}</h2><ul className="experience-links">
      {section.items.map((item, index) => <li key={index}>
        {item.command ? <CommandButton className="experience-links__action" command={item.command}>{text(item.label)} ↗</CommandButton>
          : item.href ? <a href={item.href} target="_blank" rel="noopener noreferrer">{text(item.label)} ↗</a>
            : <span className="link-placeholder">{text(item.label)}</span>}
        {item.note && <p>{text(item.note)}</p>}
      </li>)}
    </ul></section>;
    case "downloads": return <DownloadSection section={section} />;
  }
}
