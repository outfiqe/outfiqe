import type * as DesignSystem from "@outfiqe/design-system";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as PendingScansContextModule from "../context/PendingScansContext";
import { SCAN_OUTCOME, usePendingScans } from "../context/PendingScansContext";
import { CollectScanFlow } from "./CollectScanFlow";

vi.mock("@outfiqe/components", () => ({
  QrScanner: ({
    onCode,
    typedCodeLabel,
  }: {
    onCode: (code: string) => void;
    typedCodeLabel: string;
  }) => (
    <div>
      <p>{typedCodeLabel}</p>
      <button type="button" onClick={() => onCode("7k2m-9qab")}>
        Scan pickup slip
      </button>
      <button type="button" onClick={() => onCode("ABCDEFGHJK")}>
        Scan sticker
      </button>
    </div>
  ),
}));

vi.mock("@outfiqe/design-system", async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../context/PendingScansContext", async (importOriginal) => ({
  ...(await importOriginal<typeof PendingScansContextModule>()),
  usePendingScans: vi.fn(),
}));

const queueCollectScan = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  queueCollectScan.mockResolvedValue({ kind: SCAN_OUTCOME.COLLECTED });
  vi.mocked(usePendingScans).mockReturnValue({
    pendingScans: [],
    queueCollectScan,
    retryPendingScan: vi.fn(),
    discardPendingScan: vi.fn(),
  });
});

describe("CollectScanFlow", () => {
  it("asks for the pickup slip, then the sticker, then sends both", async () => {
    render(<CollectScanFlow taskId="task-1" />);

    expect(screen.getByText("Or type the pickup code")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Scan pickup slip" }));

    expect(screen.getByText("Step 2: scan the sticker on the bag")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Scan sticker" }));

    await waitFor(() =>
      expect(queueCollectScan).toHaveBeenCalledWith({
        taskId: "task-1",
        pickupCode: "7K2M9QAB",
        bagTagCode: "ABCDEFGHJK",
      }),
    );
    await waitFor(() =>
      expect(screen.getByText("Step 1: scan the pickup slip")).toBeInTheDocument(),
    );
  });

  it("warns when the sticker is scanned first", () => {
    render(<CollectScanFlow taskId="task-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Scan sticker" }));

    expect(screen.getByRole("alert")).toHaveTextContent("That's a bag sticker.");
    expect(queueCollectScan).not.toHaveBeenCalled();
  });

  it("warns when a pickup slip is scanned as the sticker", () => {
    render(<CollectScanFlow taskId="task-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Scan pickup slip" }));
    fireEvent.click(screen.getByRole("button", { name: "Scan pickup slip" }));

    expect(screen.getByRole("alert")).toHaveTextContent("That isn't a bag sticker.");
  });
});
