import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CrmTermHint } from "./CrmTermHint";

describe("CrmTermHint", () => {
  it("names the term and offers a labelled way to read what it means", () => {
    render(<CrmTermHint term="Stage" tip="How far along this person is." />);

    expect(screen.getByText("Stage")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "What Stage means" })).toBeInTheDocument();
  });
});
