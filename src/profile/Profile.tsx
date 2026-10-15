import { useMemo } from "react";
import { useLocale } from "../i18n/useLocale";
import CommandButton from "../components/CommandButton";
import ProfileCards from "./ProfileCards";
import { readProfile } from "./data";
import ProfilePortrait from "./ProfilePortrait";
import SectionRenderer from "../projects/SectionRenderer";
import GitStats from "../github/GitStats";
import "../projects/ProjectExperience.css";
import "./Profile.css";

export default function Profile({ full = false }: { full?: boolean }) {
  const { t, text } = useLocale();
  const { profile, error } = useMemo(() => readProfile(), []);
  const Container = full ? "main" : "section";
  const Heading = full ? "h1" : "h2";
  const titleId = full ? "profile-title" : "about-preview-title";
  if (!profile) return <Container className="profile-section"><p role="alert" className="notice">{t("profileUnavailable")}: {error}</p></Container>;
  return <Container id={full ? "profile" : "about-preview"} className={`profile-section ${full ? "hall profile-page" : "profile-preview"}`} aria-labelledby={titleId}>
    <div className={`profile-intro ${profile.photo ? "profile-intro--portrait" : ""}`}>
      {profile.photo && <ProfilePortrait photo={profile.photo} name={profile.name} />}
      <div className="profile-intro__copy"><p className="eyebrow">{text(profile.eyebrow)}</p>
        <Heading id={titleId}>{text(full ? profile.full.title : profile.title)}</Heading>
        <p className="profile-summary">{text(profile.summary)}</p>
        {!full && <CommandButton command="tp about" className="profile-more">{t("fullAbout")} <span aria-hidden="true">↗</span></CommandButton>}
      </div>
      <dl className="profile-details">{profile.details.map((detail, index) => <div key={index}><dt>{text(detail.label)}</dt><dd>{text(detail.value)}</dd></div>)}</dl>
    </div>
    {full && <div className="profile-story">{profile.full.paragraphs.map((paragraph, index) => <p key={index}>{text(paragraph)}</p>)}{profile.full.note && <p className="notice">{text(profile.full.note)}</p>}</div>}
    {full && profile.full.sections?.length ? <div className="content-sections profile-sections">{profile.full.sections.map((section, index) => <SectionRenderer key={index} section={section} />)}</div> : null}
    {full && <GitStats />}
    <ProfileCards cards={profile.cards} />
    {full && <CommandButton command="tp home" className="profile-return">{t("returnHome")} ↗</CommandButton>}
  </Container>;
}
