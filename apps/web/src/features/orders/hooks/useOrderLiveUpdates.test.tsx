import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { acquireSocketConnection } from "@/shared/lib/socketClient";

import { useOrderLiveUpdates } from "./useOrderLiveUpdates";

type NotificationListener = (notification: { type: string; entityId: string | null }) => void;

const listeners = new Map<string, NotificationListener>();

vi.mock("@/shared/lib/socketClient", () => ({
  acquireSocketConnection: vi.fn(() => ({
    on: (event: string, listener: NotificationListener) => listeners.set(event, listener),
    off: (event: string) => listeners.delete(event),
  })),
  releaseSocketConnection: vi.fn(),
}));

const renderLiveUpdates = () => {
  const queryClient = new QueryClient();
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  renderHook(() => useOrderLiveUpdates("order-1"), { wrapper });
  return { invalidateQueries };
};

const sendNotification = (type: string, entityId: string) =>
  listeners.get("notification:created")?.({ type, entityId });

describe("useOrderLiveUpdates", () => {
  it("refreshes the order for a status change, a refund and a late-delivery notice", () => {
    const { invalidateQueries } = renderLiveUpdates();

    sendNotification("ORDER_STATUS_CHANGED", "order-1");
    sendNotification("ORDER_REFUND_ISSUED", "order-1");
    sendNotification("ORDER_DELIVERY_LATE", "order-1");

    expect(acquireSocketConnection).toHaveBeenCalled();
    expect(invalidateQueries).toHaveBeenCalledTimes(3);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["orders", "order-1"] });
  });

  it("ignores other orders and other notifications", () => {
    const { invalidateQueries } = renderLiveUpdates();

    sendNotification("ORDER_REFUND_ISSUED", "order-2");
    sendNotification("NEW_FOLLOWER", "order-1");

    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
