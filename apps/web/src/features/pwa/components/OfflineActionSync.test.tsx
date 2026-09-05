import { onlineManager } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OfflineActionSync } from "./OfflineActionSync";

vi.mock("../utils/offlineActionProcessor", () => ({
  drainQueuedOfflineActions: vi.fn().mockResolvedValue(undefined),
}));

const { drainQueuedOfflineActions } = await import("../utils/offlineActionProcessor");

afterEach(() => {
  onlineManager.setOnline(true);
  vi.mocked(drainQueuedOfflineActions).mockClear();
});

describe("OfflineActionSync", () => {
  it("drains the queue once on load while already online", () => {
    render(<OfflineActionSync />);

    expect(drainQueuedOfflineActions).toHaveBeenCalledTimes(1);
  });

  it("does not drain while offline", () => {
    onlineManager.setOnline(false);
    render(<OfflineActionSync />);

    expect(drainQueuedOfflineActions).not.toHaveBeenCalled();
  });

  it("drains again the moment the connection comes back", () => {
    onlineManager.setOnline(false);
    render(<OfflineActionSync />);

    onlineManager.setOnline(true);

    expect(drainQueuedOfflineActions).toHaveBeenCalledTimes(1);
  });

  it("renders nothing", () => {
    const { container } = render(<OfflineActionSync />);

    expect(container).toBeEmptyDOMElement();
  });
});
