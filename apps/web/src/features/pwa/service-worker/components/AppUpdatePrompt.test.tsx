import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppUpdatePrompt } from "./AppUpdatePrompt";

type SerwistListener = () => void;

const listenersByEvent = new Map<string, SerwistListener[]>();

const messageSkipWaiting = vi.fn();

const fakeSerwist = {
  addEventListener: (event: string, listener: SerwistListener) => {
    listenersByEvent.set(event, [...(listenersByEvent.get(event) ?? []), listener]);
  },
  removeEventListener: (event: string, listener: SerwistListener) => {
    listenersByEvent.set(
      event,
      (listenersByEvent.get(event) ?? []).filter((registered) => registered !== listener),
    );
  },
  messageSkipWaiting,
};

const emit = (event: string) =>
  (listenersByEvent.get(event) ?? []).forEach((listener) => listener());

let currentPathname = "/explore";

vi.mock("@serwist/turbopack/react", () => ({
  useSerwist: () => ({ serwist: fakeSerwist }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
}));

const reloadPage = vi.fn();

beforeEach(() => {
  listenersByEvent.clear();
  messageSkipWaiting.mockClear();
  reloadPage.mockClear();
  currentPathname = "/explore";
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, reload: reloadPage },
  });
});

describe("AppUpdatePrompt", () => {
  it("stays hidden until a new version is actually waiting", () => {
    render(<AppUpdatePrompt />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("offers the update once a new version is waiting", async () => {
    render(<AppUpdatePrompt />);

    await vi.waitFor(() => expect(listenersByEvent.get("waiting")?.length).toBe(1));
    emit("waiting");

    expect(await screen.findByRole("button", { name: /reload/i })).toBeInTheDocument();
  });

  it("applies the update when the user asks for it", async () => {
    render(<AppUpdatePrompt />);
    await vi.waitFor(() => expect(listenersByEvent.get("waiting")?.length).toBe(1));
    emit("waiting");

    await userEvent.click(await screen.findByRole("button", { name: /reload/i }));

    expect(messageSkipWaiting).toHaveBeenCalledTimes(1);
  });

  it("never reloads the page on a first install the user did not ask for", async () => {
    render(<AppUpdatePrompt />);
    await vi.waitFor(() => expect(listenersByEvent.get("controlling")?.length).toBe(1));

    emit("controlling");

    expect(reloadPage).not.toHaveBeenCalled();
  });

  it("reloads once the new version takes over after the user accepted", async () => {
    render(<AppUpdatePrompt />);
    await vi.waitFor(() => expect(listenersByEvent.get("waiting")?.length).toBe(1));
    emit("waiting");
    await userEvent.click(await screen.findByRole("button", { name: /reload/i }));

    emit("controlling");

    expect(reloadPage).toHaveBeenCalledTimes(1);
  });

  it("lets the user postpone the update", async () => {
    render(<AppUpdatePrompt />);
    await vi.waitFor(() => expect(listenersByEvent.get("waiting")?.length).toBe(1));
    emit("waiting");

    await userEvent.click(await screen.findByRole("button", { name: /later/i }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(messageSkipWaiting).not.toHaveBeenCalled();
  });

  it("never interrupts someone paying", async () => {
    currentPathname = "/checkout";
    render(<AppUpdatePrompt />);
    await vi.waitFor(() => expect(listenersByEvent.get("waiting")?.length).toBe(1));

    emit("waiting");

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
