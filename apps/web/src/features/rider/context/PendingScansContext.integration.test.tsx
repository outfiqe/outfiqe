import { QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { createTestQueryClient } from "@test/integration/queryClientWrapper";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PENDING_SCAN_STATE } from "../constants/pendingScans";

const storedValues = vi.hoisted(() => new Map<string, unknown>());

vi.mock("idb-keyval", () => ({
  get: vi.fn(async (key: string) => storedValues.get(key)),
  set: vi.fn(async (key: string, value: unknown) => {
    storedValues.set(key, value);
  }),
}));

const { PendingScansProvider, SCAN_OUTCOME, usePendingScans } =
  await import("./PendingScansContext");

const COLLECT_SCAN_URL = "/api/logistics/rider/tasks/:taskId/collect-scans";
const RIDER_USER_ID = "rider-user-1";

const collectedTask = {
  id: "task-1",
  status: "COMPLETED",
  roundStartsAt: "2026-10-16T05:15:00.000Z",
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
  stops: [],
};

const newScan = { taskId: "task-1", pickupCode: "7K2M9QAB", bagTagCode: "ABCDEFGHJK" };

const renderPendingScans = () => {
  const queryClient = createTestQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <PendingScansProvider riderUserId={RIDER_USER_ID}>{children}</PendingScansProvider>
    </QueryClientProvider>
  );
  return renderHook(() => usePendingScans(), { wrapper: Wrapper });
};

beforeEach(() => {
  storedValues.clear();
  vi.stubGlobal("indexedDB", {});
});

describe("PendingScansProvider", () => {
  it("sends a scan straight away and keeps nothing on the phone", async () => {
    const receivedKeys: (string | null)[] = [];
    mswServer.use(
      http.post(COLLECT_SCAN_URL, ({ request }) => {
        receivedKeys.push(request.headers.get("Idempotency-Key"));
        return HttpResponse.json({ success: true, message: "Bag collected.", data: collectedTask });
      }),
    );
    const { result } = renderPendingScans();

    let outcomeKind = "";
    await act(async () => {
      outcomeKind = (await result.current.queueCollectScan(newScan)).kind;
    });

    expect(outcomeKind).toBe(SCAN_OUTCOME.COLLECTED);
    expect(result.current.pendingScans).toEqual([]);
    expect(receivedKeys[0]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("keeps a scan on the phone when there is no signal", async () => {
    mswServer.use(http.post(COLLECT_SCAN_URL, () => HttpResponse.error()));
    const { result } = renderPendingScans();

    let outcomeKind = "";
    await act(async () => {
      outcomeKind = (await result.current.queueCollectScan(newScan)).kind;
    });

    expect(outcomeKind).toBe(SCAN_OUTCOME.SAVED_OFFLINE);
    expect(result.current.pendingScans).toEqual([
      expect.objectContaining({ ...newScan, state: PENDING_SCAN_STATE.WAITING }),
    ]);
  });

  it("shows the hub's reason when a scan is refused, then retries it", async () => {
    mswServer.use(
      http.post(COLLECT_SCAN_URL, () =>
        HttpResponse.json(
          {
            success: false,
            message: "This sticker is already on another bag. Use a new sticker.",
            code: "BAG_TAG_ALREADY_USED",
          },
          { status: 409 },
        ),
      ),
    );
    const { result } = renderPendingScans();

    await act(async () => {
      await result.current.queueCollectScan(newScan);
    });
    const [refusedScan] = result.current.pendingScans;
    expect(refusedScan).toMatchObject({
      state: PENDING_SCAN_STATE.FAILED,
      errorMessage: "This sticker is already on another bag. Use a new sticker.",
    });

    mswServer.use(
      http.post(COLLECT_SCAN_URL, () =>
        HttpResponse.json({ success: true, message: "Bag collected.", data: collectedTask }),
      ),
    );
    await act(async () => {
      await result.current.retryPendingScan(refusedScan?.scanId ?? "");
    });
    expect(result.current.pendingScans).toEqual([]);
  });

  it("sends scans saved earlier as soon as the rider opens the app", async () => {
    storedValues.set(`outfiqe-rider-pending-scans:${RIDER_USER_ID}`, [
      {
        ...newScan,
        scanId: "saved-scan-1",
        scannedAt: "2026-10-16T05:30:00.000Z",
        state: PENDING_SCAN_STATE.WAITING,
        errorMessage: null,
      },
    ]);
    const sentScanIds: (string | null)[] = [];
    mswServer.use(
      http.post(COLLECT_SCAN_URL, ({ request }) => {
        sentScanIds.push(request.headers.get("Idempotency-Key"));
        return HttpResponse.json({ success: true, message: "Bag collected.", data: collectedTask });
      }),
    );

    const { result } = renderPendingScans();

    await waitFor(() => expect(sentScanIds).toEqual(["saved-scan-1"]));
    await waitFor(() => expect(result.current.pendingScans).toEqual([]));
  });
});
