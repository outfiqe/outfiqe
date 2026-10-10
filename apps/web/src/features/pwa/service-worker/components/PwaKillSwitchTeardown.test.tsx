import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PWA_KILL_SWITCH_ATTRIBUTE } from "../constants/pwaKillSwitch";
import { PwaKillSwitchTeardown } from "./PwaKillSwitchTeardown";

vi.mock("../utils/teardownServiceWorkerAndCaches", () => ({
  teardownServiceWorkerAndCaches: vi.fn().mockResolvedValue(undefined),
}));

afterEach(() => {
  document.documentElement.removeAttribute(PWA_KILL_SWITCH_ATTRIBUTE);
  vi.clearAllMocks();
});

describe("PwaKillSwitchTeardown", () => {
  it("tears down the service worker and caches once the kill switch is engaged", async () => {
    document.documentElement.setAttribute(PWA_KILL_SWITCH_ATTRIBUTE, "true");
    const { teardownServiceWorkerAndCaches } =
      await import("../utils/teardownServiceWorkerAndCaches");

    render(<PwaKillSwitchTeardown />);

    expect(teardownServiceWorkerAndCaches).toHaveBeenCalledTimes(1);
  });

  it("does nothing while the kill switch is not engaged", async () => {
    const { teardownServiceWorkerAndCaches } =
      await import("../utils/teardownServiceWorkerAndCaches");

    render(<PwaKillSwitchTeardown />);

    expect(teardownServiceWorkerAndCaches).not.toHaveBeenCalled();
  });

  it("renders nothing", () => {
    const { container } = render(<PwaKillSwitchTeardown />);

    expect(container).toBeEmptyDOMElement();
  });
});
