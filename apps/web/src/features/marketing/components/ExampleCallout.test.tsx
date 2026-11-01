import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ExampleCallout } from "./ExampleCallout";

describe("ExampleCallout", () => {
  it("labels the block as an example and shows its story", () => {
    render(<ExampleCallout title="Sita shares a look">Sita tags a kurta.</ExampleCallout>);

    expect(screen.getByText("Example")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sita shares a look" })).toBeInTheDocument();
    expect(screen.getByText("Sita tags a kurta.")).toBeInTheDocument();
  });
});
