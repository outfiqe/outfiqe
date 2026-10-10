import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OfflineRetryButton } from "./OfflineRetryButton";

const reloadPage = vi.fn();

beforeEach(() => {
  reloadPage.mockClear();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, reload: reloadPage },
  });
});

describe("OfflineRetryButton", () => {
  it("reloads the page so the user can retry once they reconnect", async () => {
    render(<OfflineRetryButton />);

    await userEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(reloadPage).toHaveBeenCalledTimes(1);
  });

  it("shows a pointer cursor so it reads as clickable", () => {
    render(<OfflineRetryButton />);

    expect(screen.getByRole("button", { name: /try again/i })).toHaveClass("cursor-pointer");
  });
});
