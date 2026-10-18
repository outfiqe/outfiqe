import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useLogout } from "@/features/auth";

import { PENDING_SCAN_STATE } from "../constants/pendingScans";
import { usePendingScans } from "../context/PendingScansContext";
import { RiderLogoutButton } from "./RiderLogoutButton";

vi.mock("@/features/auth", () => ({ useLogout: vi.fn() }));
vi.mock("../context/PendingScansContext", () => ({ usePendingScans: vi.fn() }));

const mutate = vi.fn();

const pendingScan = {
  scanId: "scan-1",
  taskId: "task-1",
  pickupCode: "7K2M9QAB",
  bagTagCode: "ABCDEFGHJK",
  scannedAt: "2026-10-16T08:00:00.000Z",
  state: PENDING_SCAN_STATE.WAITING,
  errorMessage: null,
};

const mockPendingScans = (pendingScans: (typeof pendingScan)[]) =>
  vi.mocked(usePendingScans).mockReturnValue({
    pendingScans,
    queueCollectScan: vi.fn(),
    retryPendingScan: vi.fn(),
    discardPendingScan: vi.fn(),
  });

const buildIdleLogoutMutation = (): ReturnType<typeof useLogout> => ({
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
  mutate,
  mutateAsync: vi.fn(),
  reset: vi.fn(),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useLogout).mockReturnValue(buildIdleLogoutMutation());
});

describe("RiderLogoutButton", () => {
  it("signs out straight away when every scan has been sent", () => {
    mockPendingScans([]);
    render(<RiderLogoutButton />);

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("warns before signing out with scans still waiting", () => {
    mockPendingScans([pendingScan]);
    render(<RiderLogoutButton />);

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(screen.getByText("1 scan still waiting on this phone.")).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Sign out anyway" }));
    expect(mutate).toHaveBeenCalledTimes(1);
  });
});
