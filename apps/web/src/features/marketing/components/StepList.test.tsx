import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StepList } from "./StepList";

const steps = [
  { title: "Apply", body: "Tell us about your brand." },
  { title: "We set you up", body: "Send photos and prices." },
];

describe("StepList", () => {
  it("renders each step, numbered in order", () => {
    render(<StepList steps={steps} />);

    expect(screen.getByRole("list")).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("01");
    expect(items[0]).toHaveTextContent("Apply");
    expect(items[1]).toHaveTextContent("02");
    expect(items[1]).toHaveTextContent("We set you up");
  });
});
