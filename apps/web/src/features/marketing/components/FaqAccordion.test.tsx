import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FaqAccordion } from "./FaqAccordion";

const entries = [
  { question: "Do I need an account?", answer: "You can browse without one." },
  { question: "How is delivery charged?", answer: "A flat fee by zone." },
];

describe("FaqAccordion", () => {
  it("renders each question and answer as a disclosure", () => {
    render(<FaqAccordion entries={entries} />);
    expect(screen.getByText("Do I need an account?")).toBeInTheDocument();
    expect(screen.getByText("You can browse without one.")).toBeInTheDocument();
    expect(document.querySelectorAll("details")).toHaveLength(2);
  });

  it("emits FAQPage structured data only when withSchema is set", () => {
    const { rerender } = render(<FaqAccordion entries={entries} />);
    expect(document.querySelector('script[type="application/ld+json"]')).toBeNull();

    rerender(<FaqAccordion entries={entries} withSchema schemaId="test-faq" />);
    const script = document.getElementById("test-faq");
    expect(script).not.toBeNull();
    const data = JSON.parse(script?.textContent ?? "{}");
    expect(data["@type"]).toBe("FAQPage");
    expect(data.mainEntity).toHaveLength(2);
  });
});
