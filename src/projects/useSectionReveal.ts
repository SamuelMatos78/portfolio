import { useEffect, useRef } from "react";

export function useSectionReveal(content: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!content || !ref.current || media.matches || !("IntersectionObserver" in window)) return;
    const sections = [...ref.current.querySelectorAll<HTMLElement>("[data-reveal]")];
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        (entry.target as HTMLElement).dataset.reveal = "visible";
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.05 });
    for (const section of sections) { section.dataset.reveal = "pending"; observer.observe(section); }
    const showAll = () => {
      if (!media.matches) return;
      sections.forEach((section) => { section.dataset.reveal = "visible"; });
      observer.disconnect();
    };
    media.addEventListener("change", showAll);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", showAll);
      sections.forEach((section) => { section.dataset.reveal = "visible"; });
    };
  }, [content]);
  return ref;
}
