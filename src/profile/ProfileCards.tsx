import { useLocale } from "../i18n/useLocale";
import type { ProfileCard } from "./types";

function CardContent({ card }: { card: ProfileCard }) {
  const { t, text } = useLocale();
  switch (card.type) {
    case "link": return <><p>{text(card.description)}</p>
      {card.href ? <a href={card.href} target="_blank" rel="noopener noreferrer" aria-label={`${t("visitLink")}: ${text(card.title)}`}>{t("visitLink")} <span aria-hidden="true">↗</span></a> : <span className="profile-card__pending">{t("linkPending")}</span>}
    </>;
    case "note": return <p>{text(card.body)}</p>;
    case "testimonial": return <blockquote><p>{text(card.quote)}</p><footer>
      <cite>{card.author.name}</cite>{card.author.role && <span>{text(card.author.role)}</span>}{card.author.relationship && <span>{text(card.author.relationship)}</span>}
    </footer></blockquote>;
  }
}

export default function ProfileCards({ cards }: { cards: ProfileCard[] }) {
  const { text } = useLocale();
  const published = cards.filter((card) => card.published);
  if (!published.length) return null;
  return <div className="profile-cards">{published.map((card) => <article key={card.id} data-profile-card={card.id} className={`profile-card profile-card--${card.type}`}>
    {card.symbol && <span className="profile-card__symbol" aria-hidden="true">{card.symbol}</span>}
    <h3>{text(card.title)}</h3><CardContent card={card} />
  </article>)}</div>;
}
