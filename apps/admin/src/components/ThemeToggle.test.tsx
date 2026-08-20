import { THEME_STORAGE_KEY, ThemeToggle } from "@outfiqe/design-system";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockMatchMedia = (matches: boolean) => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  );
};

describe("ThemeToggle", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark");
    window.localStorage.clear();
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to light mode when there is no stored preference or OS preference", async () => {
    render(<ThemeToggle />);

    expect(await screen.findByRole("button", { name: "Switch to dark mode" })).toBeInTheDocument();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("adopts the OS dark-mode preference when no explicit choice has been stored", async () => {
    mockMatchMedia(true);

    render(<ThemeToggle />);

    expect(await screen.findByRole("button", { name: "Switch to light mode" })).toBeInTheDocument();
  });

  it("toggles the dark class on the root element and persists the choice", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const toggleButton = await screen.findByRole("button", { name: "Switch to dark mode" });
    await user.click(toggleButton);

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Switch to light mode" }));

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("respects a previously stored preference over the OS preference", async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    mockMatchMedia(false);

    render(<ThemeToggle />);

    expect(await screen.findByRole("button", { name: "Switch to light mode" })).toBeInTheDocument();
  });
});
