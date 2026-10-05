import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { readLocaleCookie } from "@/i18n/localeCookie";
import { LOCALE_COOKIE_NAME } from "@/i18n/locales";

import { SiteFooter } from "./SiteFooter";

afterEach(() => {
  document.cookie = `${LOCALE_COOKIE_NAME}=; path=/; max-age=0`;
});

describe("SiteFooter", () => {
  it("renders the creator-commission disclosure", () => {
    render(<SiteFooter />);

    expect(
      screen.getByText(/muses may earn a commission when you shop the pieces they've tagged/i),
    ).toBeInTheDocument();
  });

  it("renders the navigation groups", () => {
    render(<SiteFooter />);

    expect(screen.getAllByRole("navigation").length).toBeGreaterThan(0);
  });

  it("switches the language straight away from the footer", async () => {
    render(<SiteFooter />);
    const nepali = screen.getByRole("button", { name: "नेपाली (Nepali)" });
    expect(nepali).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(nepali);

    expect(nepali).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(readLocaleCookie()).toBe("ne");
  });
});
