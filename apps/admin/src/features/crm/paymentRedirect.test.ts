import { afterEach, describe, expect, it, vi } from "vitest";

import { redirectToPaymentGateway } from "./paymentRedirect";

describe("redirectToPaymentGateway", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("navigates the window for a REDIRECT-mode checkout", () => {
    const fakeLocation = { href: "http://localhost:3000" };
    vi.stubGlobal("location", fakeLocation);

    redirectToPaymentGateway({
      mode: "REDIRECT",
      redirectUrl: "https://pay.example",
      invoiceId: "i1",
    });

    expect(fakeLocation.href).toBe("https://pay.example");
  });

  it("builds and submits a hidden form for a FORM_POST-mode checkout", () => {
    const submit = vi
      .spyOn(HTMLFormElement.prototype, "submit")
      .mockImplementation(() => undefined);

    redirectToPaymentGateway({
      mode: "FORM_POST",
      formUrl: "https://esewa.example/pay",
      fields: { amount: "900", token: "abc" },
      invoiceId: "i1",
    });

    const form = document.querySelector("form");
    expect(form?.action).toBe("https://esewa.example/pay");
    expect(form?.method).toBe("post");
    expect(form?.querySelectorAll("input[type=hidden]")).toHaveLength(2);
    expect(submit).toHaveBeenCalledOnce();
  });
});
