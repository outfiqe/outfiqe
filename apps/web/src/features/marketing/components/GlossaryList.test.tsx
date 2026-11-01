import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GlossaryList } from "./GlossaryList";

const TERMS = [
  {
    id: "muse",
    term: "Muse",
    meaning: "A person who shares outfits.",
    example: "Sita posts a look.",
    learnMore: { href: "/for-creators", label: "Become a muse" },
  },
  { id: "hub", term: "Hub", meaning: "Where pieces are checked." },
];

describe("GlossaryList", () => {
  it("shows each term with its meaning and any example or link", () => {
    render(<GlossaryList terms={TERMS} />);

    expect(screen.getByText("Muse")).toBeInTheDocument();
    expect(screen.getByText("For example: Sita posts a look.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Become a muse" })).toHaveAttribute(
      "href",
      "/for-creators",
    );
    expect(screen.getByText(/Where pieces are checked/)).toBeInTheDocument();
  });

  it("gives each term an id so other pages can link straight to it", () => {
    const { container } = render(<GlossaryList terms={TERMS} />);

    expect(container.querySelector("#hub")).not.toBeNull();
  });
});
