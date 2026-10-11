import { useLocale } from "../i18n/useLocale";
import type { ProjectSection } from "../types/project";
import Visual from "../components/Visual";

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
    case "gallery": return <section className="experience-section"><h2>{text(section.title)}</h2><div className="gallery-grid">
      {section.items.map((item, index) => <figure key={index}><Visual src={item.image} alt={text(item.alt)} label={text(item.alt)} /><figcaption>{text(item.caption)}</figcaption></figure>)}
    </div></section>;
    case "links": return <section className="experience-section"><h2>{text(section.title)}</h2><ul className="experience-links">
      {section.items.map((item, index) => <li key={index}>
        {item.href ? <a href={item.href} target="_blank" rel="noopener noreferrer">{text(item.label)} ↗</a> : <span className="link-placeholder">{text(item.label)}</span>}
        {item.note && <p>{text(item.note)}</p>}
      </li>)}
    </ul></section>;
  }
}
