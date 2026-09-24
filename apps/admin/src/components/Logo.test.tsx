import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Logo } from "@/components/Logo";

const BASE_DOMAIN = import.meta.env.VITE_TENANT_BASE_DOMAIN ?? "localhost";
const originalLocation = window.location;

afterEach(() => {
  Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
});

describe("Logo", () => {
  it("links to the web app's home page off a tenant host", () => {
    render(<Logo />);

    const expectedWebHref = import.meta.env.VITE_WEB_URL ?? "http://localhost:3000";
    const link = screen.getByRole("link", { name: "Outfique home" });
    expect(link).toHaveAttribute("href", expectedWebHref);
    expect(link).toHaveTextContent("outfiqe.");
  });

  it("links to the tenant's own storefront root when viewed on a tenant subdomain", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...originalLocation,
        hostname: `studio.${BASE_DOMAIN}`,
        origin: `https://studio.${BASE_DOMAIN}`,
      },
    });

    render(<Logo />);

    expect(screen.getByRole("link", { name: "Outfique home" })).toHaveAttribute(
      "href",
      `https://studio.${BASE_DOMAIN}`,
    );
  });

  it('applies the large text size class for size="lg"', () => {
    render(<Logo size="lg" />);

    const wordmark = screen.getByText("out", { exact: false });
    expect(wordmark.parentElement).toHaveClass("text-4xl");
  });
});
