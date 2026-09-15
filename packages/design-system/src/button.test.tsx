import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it("renders its label and stays enabled when not loading", () => {
    render(<Button>Save</Button>);

    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeEnabled();
    expect(button).not.toHaveAttribute("aria-busy");
  });

  it("replaces the label with a spinner and disables the button while loading", () => {
    render(<Button isLoading>Save</Button>);

    const button = screen.getByRole("button", { name: "Loading" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("Save")).not.toBeInTheDocument();
  });

  it("stays disabled when disabled is passed alongside isLoading", () => {
    render(
      <Button isLoading disabled>
        Save
      </Button>,
    );

    expect(screen.getByRole("button", { name: "Loading" })).toBeDisabled();
  });

  it("does not swap children for a spinner when used with asChild", () => {
    render(
      <Button asChild isLoading>
        <a href="/somewhere">Go</a>
      </Button>,
    );

    expect(screen.getByRole("link", { name: "Go" })).toBeInTheDocument();
  });
});
