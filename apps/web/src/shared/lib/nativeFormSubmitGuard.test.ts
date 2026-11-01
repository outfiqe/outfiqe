import { createHash } from "node:crypto";

import { afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  NATIVE_FORM_SUBMIT_GUARD_SCRIPT,
  NATIVE_FORM_SUBMIT_GUARD_SHA256,
} from "./nativeFormSubmitGuard";

const submitForm = (form: HTMLFormElement) => {
  document.body.append(form);
  const submitEvent = new Event("submit", { bubbles: true, cancelable: true });
  form.dispatchEvent(submitEvent);
  return submitEvent;
};

describe("native form submit guard", () => {
  beforeAll(() => {
    new Function(NATIVE_FORM_SUBMIT_GUARD_SCRIPT)();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("publishes the hash the content security policy needs", () => {
    const digest = createHash("sha256")
      .update(NATIVE_FORM_SUBMIT_GUARD_SCRIPT, "utf8")
      .digest("base64");

    expect(NATIVE_FORM_SUBMIT_GUARD_SHA256).toBe(`sha256-${digest}`);
  });

  it("stops a form with no action from sending its fields in the URL", () => {
    const submitEvent = submitForm(document.createElement("form"));

    expect(submitEvent.defaultPrevented).toBe(true);
  });

  it("leaves a form with its own action alone", () => {
    const paymentForm = document.createElement("form");
    paymentForm.setAttribute("action", "https://rc-epay.esewa.com.np/api/epay/main/v2/form");

    const submitEvent = submitForm(paymentForm);

    expect(submitEvent.defaultPrevented).toBe(false);
  });
});
