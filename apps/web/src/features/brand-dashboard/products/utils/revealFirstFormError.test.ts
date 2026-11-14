import { beforeEach, describe, expect, it, vi } from "vitest";

import { revealFirstFormError } from "./revealFirstFormError";

const scrollIntoView = vi.fn();

beforeEach(() => {
  scrollIntoView.mockClear();
  Element.prototype.scrollIntoView = scrollIntoView;
  document.body.innerHTML = "";
});

describe("revealFirstFormError", () => {
  it("scrolls the first error message into the middle of the form", () => {
    document.body.innerHTML = `
      <div id="form">
        <p>Fine field</p>
        <p role="alert" id="first">Add at least one size</p>
        <p role="alert">Pick a category</p>
      </div>`;

    expect(revealFirstFormError(document.getElementById("form"))).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "center", behavior: "smooth" });
    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById("first"));
  });

  it("also focuses the field when the first problem is an invalid input", () => {
    document.body.innerHTML = `<div id="form"><input aria-invalid="true" id="price" /></div>`;

    revealFirstFormError(document.getElementById("form"));

    expect(document.activeElement).toBe(document.getElementById("price"));
  });

  it("does nothing when there is no error to show", () => {
    document.body.innerHTML = `<div id="form"><p>All good</p></div>`;

    expect(revealFirstFormError(document.getElementById("form"))).toBe(false);
    expect(revealFirstFormError(null)).toBe(false);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
