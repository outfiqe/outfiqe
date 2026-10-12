import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OfflineActionSync } from "./OfflineActionSync";

vi.mock("../utils/offlineActionProcessor", () => ({
  drainQueuedOfflineActions: vi.fn().mockResolvedValue(undefined),
}));

const { drainQueuedOfflineActions } = await import("../utils/offlineActionProcessor");

const renderWithQueryClient = () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { ...render(<OfflineActionSync />, { wrapper }), queryClient };
};

afterEach(() => {
  onlineManager.setOnline(true);
  vi.mocked(drainQueuedOfflineActions).mockClear();
});

describe("OfflineActionSync", () => {
  it("drains the queue once on load while already online", () => {
    const { queryClient } = renderWithQueryClient();

    expect(drainQueuedOfflineActions).toHaveBeenCalledTimes(1);
    expect(drainQueuedOfflineActions).toHaveBeenCalledWith(queryClient);
  });

  it("does not drain while offline", () => {
    onlineManager.setOnline(false);
    renderWithQueryClient();

    expect(drainQueuedOfflineActions).not.toHaveBeenCalled();
  });

  it("drains again the moment the connection comes back", () => {
    onlineManager.setOnline(false);
    renderWithQueryClient();

    onlineManager.setOnline(true);

    expect(drainQueuedOfflineActions).toHaveBeenCalledTimes(1);
  });

  it("renders nothing", () => {
    const { container } = renderWithQueryClient();

    expect(container).toBeEmptyDOMElement();
  });
});
