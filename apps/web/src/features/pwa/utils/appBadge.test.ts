import { afterEach, describe, expect, it, vi } from "vitest";

import { showUnreadBadge } from "./appBadge";

const setAppBadge = vi.fn(() => Promise.resolve());
const clearAppBadge = vi.fn(() => Promise.resolve());

afterEach(() => {
  setAppBadge.mockClear();
  clearAppBadge.mockClear();
  Reflect.deleteProperty(navigator, "setAppBadge");
  Reflect.deleteProperty(navigator, "clearAppBadge");
});

const giveBadgingApi = () => {
  Object.defineProperty(navigator, "setAppBadge", { configurable: true, value: setAppBadge });
  Object.defineProperty(navigator, "clearAppBadge", { configurable: true, value: clearAppBadge });
};

describe("showUnreadBadge", () => {
  it("shows the count on the app icon when there is unread activity", () => {
    giveBadgingApi();

    showUnreadBadge(4);

    expect(setAppBadge).toHaveBeenCalledWith(4);
  });

  it("clears the badge when nothing is unread", () => {
    giveBadgingApi();

    showUnreadBadge(0);

    expect(clearAppBadge).toHaveBeenCalledTimes(1);
    expect(setAppBadge).not.toHaveBeenCalled();
  });

  it("does nothing on a browser without the badging api", () => {
    expect(() => showUnreadBadge(3)).not.toThrow();
  });
});
