import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LOGO_MARK_PATHS, LOGO_WORDMARK_TEXT } from "./logo.constants";
import { LogoMark, LogoWordmark } from "./logo-mark";

describe("LogoMark", () => {
  it("draws every shared mark path, tinting only the primary one", () => {
    const { container } = render(<LogoMark className="size-7" />);
    const paths = container.querySelectorAll("path");

    expect(container.querySelector("svg")).toHaveClass("size-7");
    expect(paths).toHaveLength(LOGO_MARK_PATHS.length);
    expect(container.querySelectorAll("path.fill-primary")).toHaveLength(1);
  });
});

describe("LogoWordmark", () => {
  it("renders the shared wordmark with each segment in its brand colour", () => {
    render(<LogoWordmark className="text-2xl" />);

    expect(screen.getByText("out")).toHaveClass("text-primary");
    expect(screen.getByText("fiqe.")).toHaveClass("text-secondary");
    expect(screen.getByText("out").parentElement).toHaveTextContent(LOGO_WORDMARK_TEXT);
    expect(screen.getByText("out").parentElement).toHaveClass("text-2xl");
  });
});
