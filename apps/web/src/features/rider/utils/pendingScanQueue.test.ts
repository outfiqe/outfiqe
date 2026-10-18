import { beforeEach, describe, expect, it, vi } from "vitest";

import { PENDING_SCAN_STATE } from "../constants/pendingScans";

const storedValues = vi.hoisted(() => new Map<string, unknown>());

vi.mock("idb-keyval", () => ({
  get: vi.fn(async (key: string) => storedValues.get(key)),
  set: vi.fn(async (key: string, value: unknown) => {
    storedValues.set(key, value);
  }),
}));

const { addPendingScan, readPendingScans, removePendingScan, updatePendingScan } =
  await import("./pendingScanQueue");

const RIDER_ID = "rider-user-1";
const OTHER_RIDER_ID = "rider-user-2";

const scanFor = (scanId: string) => ({
  scanId,
  taskId: "task-1",
  pickupCode: "7K2M9QAB",
  bagTagCode: "ABCDEFGHJK",
  scannedAt: "2026-10-16T08:00:00.000Z",
});

beforeEach(() => {
  storedValues.clear();
  vi.stubGlobal("indexedDB", {});
});

describe("pendingScanQueue", () => {
  it("keeps each rider's scans apart", async () => {
    await addPendingScan(RIDER_ID, scanFor("scan-1"));

    expect(await readPendingScans(RIDER_ID)).toEqual([
      { ...scanFor("scan-1"), state: PENDING_SCAN_STATE.WAITING, errorMessage: null },
    ]);
    expect(await readPendingScans(OTHER_RIDER_ID)).toEqual([]);
  });

  it("does not store the same scan twice", async () => {
    await addPendingScan(RIDER_ID, scanFor("scan-1"));
    await addPendingScan(RIDER_ID, scanFor("scan-1"));

    expect(await readPendingScans(RIDER_ID)).toHaveLength(1);
  });

  it("marks a scan as failed and removes it", async () => {
    await addPendingScan(RIDER_ID, scanFor("scan-1"));
    await addPendingScan(RIDER_ID, scanFor("scan-2"));

    const afterFailure = await updatePendingScan(RIDER_ID, "scan-1", {
      state: PENDING_SCAN_STATE.FAILED,
      errorMessage: "Sticker already used",
    });
    expect(afterFailure[0]).toMatchObject({
      state: PENDING_SCAN_STATE.FAILED,
      errorMessage: "Sticker already used",
    });

    expect(await removePendingScan(RIDER_ID, "scan-1")).toEqual([
      expect.objectContaining({ scanId: "scan-2" }),
    ]);
  });

  it("returns nothing when the browser has no storage", async () => {
    vi.stubGlobal("indexedDB", undefined);

    expect(await readPendingScans(RIDER_ID)).toEqual([]);
  });
});
