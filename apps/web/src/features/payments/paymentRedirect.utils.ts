import type { PaymentInitiateResult } from "./api/paymentsSchemas";

export const redirectToPaymentGateway = (result: PaymentInitiateResult): void => {
  if (result.mode === "REDIRECT") {
    window.location.href = result.redirectUrl;
    return;
  }

  const form = document.createElement("form");
  form.method = "POST";
  form.action = result.formUrl;

  for (const [name, value] of Object.entries(result.fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
};
