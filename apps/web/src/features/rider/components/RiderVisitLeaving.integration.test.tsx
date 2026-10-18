import { Toaster } from "@outfiqe/design-system";
import { mswServer } from "@test/integration/msw/server";
import { createQueryClientWrapper } from "@test/integration/queryClientWrapper";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PENDING_SCAN_STATE } from "../constants/pendingScans";
import type * as PendingScansContextModule from "../context/PendingScansContext";
import { usePendingScans } from "../context/PendingScansContext";
import { RiderVisitPage } from "./RiderVisitPage";

vi.mock("../context/PendingScansContext", async (importOriginal) => ({
  ...(await importOriginal<typeof PendingScansContextModule>()),
  usePendingScans: vi.fn(),
}));
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@outfiqe/components", () => ({
  QrScanner: () => <p>Camera</p>,
}));

const TASK_URL = "/api/logistics/rider/tasks/task-1";

const buildStop = (id: string, isCollected: boolean) => ({
  id,
  direction: "COLLECT",
  brandReturn: null,
  fulfilmentGroupId: `group-${id}`,
  orderId: "8b3f4e3a-6dac",
  itemCount: 1,
  isCollected,
  bagTagCode: isCollected ? "ABCDEFGHJK" : null,
});

const halfCollectedVisit = {
  id: "task-1",
  status: "IN_PROGRESS",
  roundStartsAt: "2026-10-17T05:15:00.000Z",
  brandName: "Kathmandu Knits",
  pickupLocation: {
    label: "Studio",
    contactName: "Mina",
    contactPhoneE164: "+9779812345678",
    address: "Jhamsikhel Road",
    landmark: null,
    city: "Lalitpur",
    latitude: null,
    longitude: null,
    openingNote: null,
  },
  stops: [buildStop("stop-1", true), buildStop("stop-2", false)],
};

const okJson = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const mockPendingScans = (pendingScans: ReturnType<typeof usePendingScans>["pendingScans"]) =>
  vi.mocked(usePendingScans).mockReturnValue({
    pendingScans,
    queueCollectScan: vi.fn(),
    retryPendingScan: vi.fn(),
    discardPendingScan: vi.fn(),
  });

const renderVisit = () =>
  render(
    <>
      <RiderVisitPage taskId="task-1" />
      <Toaster />
    </>,
    { wrapper: createQueryClientWrapper() },
  );

beforeEach(() => {
  mockPendingScans([]);
});

describe("leaving a visit early", () => {
  it("asks before leaving the bags that aren't ready", async () => {
    let finishCount = 0;
    mswServer.use(
      http.get(TASK_URL, () => okJson(halfCollectedVisit)),
      http.post(`${TASK_URL}/finish`, () => {
        finishCount += 1;
        return okJson({ ...halfCollectedVisit, status: "COMPLETED" });
      }),
    );
    const user = userEvent.setup();
    renderVisit();

    await user.click(await screen.findByRole("button", { name: "Leave without the rest" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/leave 1 bag that isn't ready/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Stay" }));
    expect(finishCount).toBe(0);

    await user.click(screen.getByRole("button", { name: "Leave without the rest" }));
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Leave" }),
    );

    await waitFor(() => expect(finishCount).toBe(1));
  });

  it("won't let the rider finish or waste the visit while scans are still on the phone", async () => {
    mockPendingScans([
      {
        scanId: "scan-1",
        taskId: "task-1",
        pickupCode: "7K2M9QAB",
        bagTagCode: "ABCDEFGHJK",
        scannedAt: "2026-10-17T05:20:00.000Z",
        state: PENDING_SCAN_STATE.WAITING,
        errorMessage: null,
      },
    ]);
    mswServer.use(
      http.get(TASK_URL, () =>
        okJson({ ...halfCollectedVisit, stops: [buildStop("stop-1", false)] }),
      ),
    );
    renderVisit();

    expect(
      await screen.findByText(/1 scan is saved on this phone and hasn't sent yet/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Nothing to collect here" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Leave without the rest" }),
    ).not.toBeInTheDocument();
  });
});
