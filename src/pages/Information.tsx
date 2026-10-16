import { useLocale } from "../i18n/useLocale";
import homeData from "../data/home.json";
import CommandButton from "../components/CommandButton";
import Profile from "../profile/Profile";
import type { HomeData } from "../types/content";
import content from "../data/information.json";
import { validateInformation } from "../runtime/information";
import SectionRenderer from "../projects/SectionRenderer";
import "../projects/ProjectExperience.css";
import Resume from "../resume/Resume";
import ContactForm from "../contact/ContactForm";

const informationData: HomeData["information"] = homeData.information;

export default function Information({ id }: { id: string }) {
  const information = informationData.find((item) => item.id === id);
  const { t, text } = useLocale();
  if (information?.content === "profile") return <Profile full />;
  if (information?.content === "resume") return <Resume title={information.title} id={id} />;
  let sections;
  let error;
  try { sections = validateInformation(content, informationData.map((item) => item.id))[id] ?? []; }
  catch (cause) { error = cause instanceof Error ? cause.message : t("unavailable"); }
  return <main className={`hall information${id === "contact" ? " information--contact" : ""}`}>
    <p className="eyebrow">{t("domain")} / {text(information?.title)}</p>
    <h1>{information ? text(information.title) : t("unregisteredInfo")}</h1>
    <p>{text(information?.description)}</p>{information?.note && <p className="notice">{text(information.note)}</p>}
    {id === "contact" && <ContactForm />}
    {error && <p role="alert" className="notice">{error}</p>}
    {sections && <div className="content-sections information-sections">{sections.map((section, index) => <SectionRenderer section={section} key={index} />)}</div>}
    <CommandButton command="tp home">{t("returnHome")} ↗</CommandButton>
  </main>;
}
