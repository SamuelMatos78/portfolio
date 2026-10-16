export const CONTACT_LIMITS = { email: 254, subject: 120, message: 3000 } as const;

export interface ContactFields { email: string; subject: string; message: string }
export type ContactError = "email" | "subject" | "message";

/** Browser-side UX validation. Delivery, CAPTCHA and server validation belong to FormSubmit. */
export function validateContact(input: ContactFields): { fields: ContactFields; error?: ContactError } {
  const fields = { email: input.email.trim(), subject: input.subject.trim(), message: input.message.trim() };
  // Keep email to a single plain address, with no display names, extra recipients or headers.
  if (fields.email.length > CONTACT_LIMITS.email || /[\r\n]/.test(input.email) || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(fields.email)) return { fields, error: "email" };
  // Topic is body data, never an email header. Reject controls, markup and bidi overrides.
  // oxlint-disable-next-line no-control-regex -- Deliberately detect controls in untrusted form data.
  if (fields.subject.length < 3 || fields.subject.length > CONTACT_LIMITS.subject || /[\u0000-\u001f\u007f<>\u202a-\u202e\u2066-\u2069]/u.test(input.subject)) return { fields, error: "subject" };
  // Optional plain text, with line breaks allowed; no attachments or HTML fields.
  // oxlint-disable-next-line no-control-regex -- Deliberately detect controls in untrusted form data.
  if (fields.message.length > CONTACT_LIMITS.message || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(input.message)) return { fields, error: "message" };
  return { fields };
}
