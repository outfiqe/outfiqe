import type { CheckoutRedirect } from "./billingSchemas";

export const redirectToPaymentGateway = (redirect: CheckoutRedirect): void => {
  if (redirect.mode === "REDIRECT") {
    window.location.href = redirect.redirectUrl;
    return;
  }

  const form = document.createElement("form");
  form.method = "POST";
  form.action = redirect.formUrl;

  for (const [name, value] of Object.entries(redirect.fields)) {
    const field = document.createElement("input");
    field.type = "hidden";
    field.name = name;
    field.value = value;
    form.appendChild(field);
  }

  document.body.appendChild(form);
  form.submit();
};
