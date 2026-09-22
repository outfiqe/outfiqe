import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FeatureGrid } from "./FeatureGrid";

const items = [
  { title: "Free to list", body: "No fee for visibility, ever." },
  { title: "Commission only on sales", body: "We only earn when you sell." },
];

describe("FeatureGrid", () => {
  it("renders each feature's title and body as a list", () => {
    render(<FeatureGrid items={items} />);

    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Free to list")).toBeInTheDocument();
    expect(screen.getByText("We only earn when you sell.")).toBeInTheDocument();
  });
});
