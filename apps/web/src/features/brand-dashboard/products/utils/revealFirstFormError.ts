const FORM_ERROR_SELECTOR = '[role="alert"], [aria-invalid="true"]';
const FOCUSABLE_FIELD_SELECTOR = "input, select, textarea";

export const revealFirstFormError = (formArea: HTMLElement | null): boolean => {
  const firstError = formArea?.querySelector<HTMLElement>(FORM_ERROR_SELECTOR);
  if (!firstError) return false;

  firstError.scrollIntoView({ block: "center", behavior: "smooth" });
  const invalidField = firstError.matches(FOCUSABLE_FIELD_SELECTOR) ? firstError : null;
  invalidField?.focus({ preventScroll: true });
  return true;
};
