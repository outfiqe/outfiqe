import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Logo } from "./Logo";

describe("Logo", () => {
  it("links home and keeps the wordmark visible by default", () => {
    render(<Logo />);

    const link = screen.getByRole("link", { name: /outfique home/i });
    expect(link).toHaveAttribute("href", "/");
    expect(screen.getByText("out")).toBeVisible();
    expect(screen.getByText("fiqe.")).toBeVisible();
  });

  it("applies wordmarkClassName to the wordmark so a caller can hide it responsively", () => {
    render(<Logo wordmarkClassName="hidden sm:inline" />);

    const wordmark = screen.getByText("out").parentElement;
    expect(wordmark).toHaveClass("hidden", "sm:inline");
  });
});
