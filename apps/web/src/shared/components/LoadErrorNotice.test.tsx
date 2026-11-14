import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LoadErrorNotice } from "./LoadErrorNotice";

describe("LoadErrorNotice", () => {
  it("announces the message as an alert and retries when asked", () => {
    const retryLoading = vi.fn();
    render(<LoadErrorNotice message="We couldn't load your bag." onRetry={retryLoading} />);

    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't load your bag.");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(retryLoading).toHaveBeenCalledOnce();
  });

  it("centres its content when asked", () => {
    render(<LoadErrorNotice align="center" message="Failed" onRetry={vi.fn()} />);

    expect(screen.getByRole("alert")).toHaveClass("items-center", "text-center");
  });
});
