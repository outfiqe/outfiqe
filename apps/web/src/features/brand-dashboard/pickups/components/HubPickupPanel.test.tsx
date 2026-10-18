import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useMarkReadyForPickup } from "../hooks/useMarkReadyForPickup";
import { HubPickupPanel } from "./HubPickupPanel";

vi.mock("../hooks/useMarkReadyForPickup", () => ({ useMarkReadyForPickup: vi.fn() }));
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const mutateAsync = vi.fn().mockResolvedValue(undefined);

const buildIdleMarkReadyMutation = (): ReturnType<typeof useMarkReadyForPickup> => ({
  context: undefined,
  data: undefined,
  error: null,
  failureCount: 0,
  failureReason: null,
  isPaused: false,
  status: "idle",
  variables: undefined,
  submittedAt: 0,
  isError: false,
  isIdle: true,
  isPending: false,
  isSuccess: false,
  mutate: vi.fn(),
  mutateAsync,
  reset: vi.fn(),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useMarkReadyForPickup).mockReturnValue(buildIdleMarkReadyMutation());
});

describe("HubPickupPanel", () => {
  it("lets the brand mark a packed order ready for pickup", () => {
    render(
      <HubPickupPanel
        fulfilmentGroupId="grp-1"
        pickupStatus="AWAITING_BRAND"
        pickupCode="7K2M9QAB"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mark ready for pickup" }));

    expect(mutateAsync).toHaveBeenCalledTimes(1);
  });

  it("shows the pickup code, its QR and the printable slip once ready", () => {
    render(
      <HubPickupPanel
        fulfilmentGroupId="grp-1"
        pickupStatus="READY_FOR_PICKUP"
        pickupCode="7K2M9QAB"
      />,
    );

    expect(screen.getByRole("img", { name: "Pickup code 7K2M9QAB" })).toBeInTheDocument();
    expect(screen.getByText("7K2M9QAB")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Print pickup slip" })).toHaveAttribute(
      "href",
      "/print/pickup-slip/grp-1",
    );
    expect(screen.queryByRole("button", { name: "Mark ready for pickup" })).not.toBeInTheDocument();
  });

  it("tells the brand there is nothing more to do once the rider has collected it", () => {
    render(
      <HubPickupPanel fulfilmentGroupId="grp-1" pickupStatus="PICKED_UP" pickupCode="7K2M9QAB" />,
    );

    expect(screen.getByText(/An Outfiqe rider has collected this order/)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
