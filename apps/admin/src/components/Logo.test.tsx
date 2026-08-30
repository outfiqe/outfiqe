import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Logo } from "@/components/Logo";

describe("Logo", () => {
  it("renders the wordmark and links to the web app's home page", () => {
    render(<Logo />);

    const expectedWebHref = import.meta.env.VITE_WEB_URL ?? "http://localhost:3000";
    const link = screen.getByRole("link", { name: "Outfique home" });
    expect(link).toHaveAttribute("href", expectedWebHref);
    expect(link).toHaveTextContent("outfiqe.");
  });

  it('applies the large text size class for size="lg"', () => {
    render(<Logo size="lg" />);

    const wordmark = screen.getByText("out", { exact: false });
    expect(wordmark.parentElement).toHaveClass("text-4xl");
  });
});
