import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { InstallPromptState } from "../hooks/useInstallPrompt";
import { InstallPrompt } from "./InstallPrompt";

let state: InstallPromptState = "hidden";
const dismiss = vi.fn();
const install = vi.fn();

vi.mock("../hooks/useInstallPrompt", () => ({
  useInstallPrompt: () => ({ state, dismiss, install }),
}));

beforeEach(() => {
  state = "hidden";
  dismiss.mockReset();
  install.mockReset();
});

describe("InstallPrompt", () => {
  it("stays out of the way when there is nothing to offer", () => {
    render(<InstallPrompt />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("offers a direct install when the browser can do one", () => {
    state = "can-install";
    render(<InstallPrompt />);

    expect(screen.getByRole("button", { name: /install/i })).toBeInTheDocument();
  });

  it("triggers the real browser install when the button is pressed", async () => {
    state = "can-install";
    render(<InstallPrompt />);

    await userEvent.click(screen.getByRole("button", { name: /install/i }));

    expect(install).toHaveBeenCalledTimes(1);
  });

  it("lets the user dismiss the bar", async () => {
    state = "can-install";
    render(<InstallPrompt />);

    await userEvent.click(screen.getByText(/not now/i));

    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it("shows the Add to Home Screen steps on an iOS browser tab instead of installing directly", async () => {
    state = "ios-instructions";
    render(<InstallPrompt />);

    await userEvent.click(screen.getByRole("button", { name: /install/i }));

    expect(install).not.toHaveBeenCalled();
    expect(screen.getByText(/tap the share icon/i)).toBeInTheDocument();
    expect(screen.getByText(/add to home screen/i)).toBeInTheDocument();
  });

  it("closes the iOS instructions from their own button", async () => {
    state = "ios-instructions";
    render(<InstallPrompt />);
    await userEvent.click(screen.getByRole("button", { name: /install/i }));

    await userEvent.click(screen.getByRole("button", { name: /got it/i }));

    expect(screen.queryByText(/tap the share icon/i)).not.toBeInTheDocument();
  });
});
