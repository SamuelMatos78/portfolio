import { useId, useState } from "react";
import type { FormEvent } from "react";
import { useLocale } from "../i18n/useLocale";
import config from "../data/contact.json";
import { CONTACT_LIMITS, validateContact } from "./validation";
import type { ContactError } from "./validation";
import "./ContactForm.css";

export default function ContactForm() {
  const { locale, t, text } = useLocale();
  const id = useId();
  const [error, setError] = useState<ContactError>();
  const errorMessages = { email: t("contactInvalidEmail"), subject: t("contactInvalidSubject"), message: t("contactInvalidMessage") };

  function submit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const data = new FormData(form);
    const result = validateContact({ email: String(data.get("email") ?? ""), subject: String(data.get("Assunto") ?? ""), message: String(data.get("message") ?? "") });
    setError(result.error);
    if (result.error) {
      event.preventDefault();
      const name = { email: "email", subject: "Assunto", message: "message" }[result.error];
      (form.elements.namedItem(name) as HTMLElement | null)?.focus();
      return;
    }
    // Keep native POST: the provider's CAPTCHA is required for confirmation emails.
    (form.elements.namedItem("email") as HTMLInputElement).value = result.fields.email;
    (form.elements.namedItem("Assunto") as HTMLInputElement).value = result.fields.subject;
    (form.elements.namedItem("message") as HTMLTextAreaElement).value = result.fields.message;
  }

  return <section className="contact-panel" aria-labelledby={`${id}-title`}>
    <div className="contact-panel__intro">
      <p className="eyebrow">{t("contactEyebrow")}</p>
      <h2 id={`${id}-title`}>{t("contactTitle")}</h2>
      <p>{t("contactDescription")}</p>
      <a className="contact-panel__email" href={`mailto:${config.recipient}`}>{config.recipient} ↗</a>
      <p className="contact-panel__confirmation">{t("contactConfirmation")}</p>
    </div>
    <form className="contact-form" action={`https://formsubmit.co/${config.recipient}`} method="POST" onSubmit={submit} aria-describedby={`${id}-privacy`}>
      <input type="hidden" name="_subject" value={config.emailSubject} />
      <input type="hidden" name="_autoresponse" value={text(config.confirmation)} />
      <input type="hidden" name="_template" value="basic" />
      <input type="hidden" name="_captcha" value="true" />
      <input type="hidden" name="Idioma" value={locale} />
      <div className="contact-form__honey" aria-hidden="true"><label htmlFor={`${id}-website`}>Website</label><input id={`${id}-website`} name="_honey" type="text" tabIndex={-1} autoComplete="off" /></div>
      <label htmlFor={`${id}-email`}>{t("contactEmail")}</label>
      <input id={`${id}-email`} name="email" type="email" required maxLength={CONTACT_LIMITS.email} autoComplete="email" placeholder={t("contactEmailPlaceholder")} aria-invalid={error === "email" || undefined} aria-describedby={error === "email" ? `${id}-error` : undefined} />
      <label htmlFor={`${id}-subject`}>{t("contactSubject")}</label>
      <input id={`${id}-subject`} name="Assunto" type="text" required minLength={3} maxLength={CONTACT_LIMITS.subject} placeholder={t("contactSubjectPlaceholder")} aria-invalid={error === "subject" || undefined} aria-describedby={`${id}-subject-help${error === "subject" ? ` ${id}-error` : ""}`} />
      <small id={`${id}-subject-help`}>{t("contactSubjectHelp")}</small>
      <label htmlFor={`${id}-message`}>{t("contactMessage")}</label>
      <textarea id={`${id}-message`} name="message" rows={5} maxLength={CONTACT_LIMITS.message} placeholder={t("contactMessagePlaceholder")} aria-invalid={error === "message" || undefined} aria-describedby={error === "message" ? `${id}-error` : undefined} />
      {error && <p className="contact-form__error" id={`${id}-error`} role="alert">{errorMessages[error]}</p>}
      <p className="contact-form__privacy" id={`${id}-privacy`}>{t("contactPrivacy")}</p>
      <button type="submit" className="contact-form__submit">{t("contactSend")} <span aria-hidden="true">↗</span></button>
      <small>{t("contactCaptcha")}</small>
    </form>
  </section>;
}
