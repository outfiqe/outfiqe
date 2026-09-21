import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { toast, Toaster } from "./toast";

afterEach(() => {
  act(() => toast.clear());
});

describe("toast", () => {
  it("shows a success message in the toaster", () => {
    render(<Toaster />);

    act(() => toast.success("Saved."));

    expect(screen.getByText("Saved.")).toBeInTheDocument();
  });

  it("shows several messages at once", () => {
    render(<Toaster />);

    act(() => {
      toast.success("First.");
      toast.error("Second.");
    });

    expect(screen.getByText("First.")).toBeInTheDocument();
    expect(screen.getByText("Second.")).toBeInTheDocument();
  });

  it("clears every message so the next screen starts with none", () => {
    render(<Toaster />);
    act(() => {
      toast.success("First.");
      toast.warning("Second.");
    });

    act(() => toast.clear());

    expect(screen.queryByText("First.")).not.toBeInTheDocument();
    expect(screen.queryByText("Second.")).not.toBeInTheDocument();
  });

  it("renders nothing when there are no messages", () => {
    const { container } = render(<Toaster />);

    expect(container).toBeEmptyDOMElement();
  });
});
