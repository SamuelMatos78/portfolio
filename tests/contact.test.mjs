import test from "node:test";
import assert from "node:assert/strict";
import { CONTACT_LIMITS, validateContact } from "../src/contact/validation.ts";

const valid = { email: "visitor+portfolio@example.com", subject: "Oportunidade em C++ e IA", message: "Vamos conversar?\nTenho uma ideia." };

test("contact accepts a single email and multilingual plain topic, with optional message", () => {
  assert.equal(validateContact(valid).error, undefined);
  const trimmed = validateContact({ ...valid, email: ` ${valid.email} `, subject: ` ${valid.subject} `, message: "  " });
  assert.deepEqual(trimmed, { fields: { ...valid, message: "" } });
  assert.equal(validateContact({ ...valid, subject: "Software engineering — let's talk" }).error, undefined);
});

test("contact rejects header injection, markup, hidden direction controls and excessive input", () => {
  for (const email of ["a@example.com\r\nBcc: victim@example.com", "a@example.com\r\n", "a@example.com,b@example.com", "Name <a@example.com>", "a@example.com\0", "a@", "a@-bad.com"]) {
    assert.equal(validateContact({ ...valid, email }).error, "email", JSON.stringify(email));
  }
  for (const subject of ["xx", "Valid\r\nBcc: victim@example.com", "<script>alert(1)</script>", "topic\0", "topic\u202etxt", "a".repeat(CONTACT_LIMITS.subject + 1)]) {
    assert.equal(validateContact({ ...valid, subject }).error, "subject", JSON.stringify(subject));
  }
  assert.equal(validateContact({ ...valid, message: "a".repeat(CONTACT_LIMITS.message + 1) }).error, "message");
  assert.equal(validateContact({ ...valid, message: "hello\0" }).error, "message");
});

