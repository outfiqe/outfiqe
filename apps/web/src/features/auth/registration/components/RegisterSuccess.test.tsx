import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RegisterSuccess } from "./RegisterSuccess";

describe("RegisterSuccess", () => {
  it("names the address the confirmation link went to", () => {
    render(<RegisterSuccess email="aarati@example.com" onGoBack={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Check your email" })).toBeInTheDocument();
    expect(screen.getByText("aarati@example.com")).toBeInTheDocument();
    expect(screen.queryByText(/Check your email —/)).not.toBeInTheDocument();
  });

  it("lets the visitor go back to fix a wrong address", () => {
    const goBack = vi.fn();
    render(<RegisterSuccess email="aarati@example.com" onGoBack={goBack} />);

    fireEvent.click(screen.getByRole("button", { name: "Go back" }));

    expect(goBack).toHaveBeenCalledOnce();
  });
});
