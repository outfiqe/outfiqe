import { get, set } from "idb-keyval";

import { runWithoutFailingWhenStorageIsUnavailable } from "@/features/pwa/offline/utils/browserDatabase";

import type { CollectScanRequest } from "../api/riderApi";
import {
  PENDING_SCAN_STATE,
  PENDING_SCANS_STORAGE_KEY_PREFIX,
  type PendingScanState,
} from "../constants/pendingScans";

export type PendingScan = CollectScanRequest & {
  state: PendingScanState;
  errorMessage: string | null;
};

const storageKeyFor = (riderUserId: string) => `${PENDING_SCANS_STORAGE_KEY_PREFIX}:${riderUserId}`;

export const readPendingScans = async (riderUserId: string): Promise<PendingScan[]> =>
  (await runWithoutFailingWhenStorageIsUnavailable(() =>
    get<PendingScan[]>(storageKeyFor(riderUserId)),
  )) ?? [];

const writePendingScans = async (riderUserId: string, pendingScans: PendingScan[]) => {
  await runWithoutFailingWhenStorageIsUnavailable(() =>
    set(storageKeyFor(riderUserId), pendingScans),
  );
};

export const addPendingScan = async (
  riderUserId: string,
  scan: CollectScanRequest,
): Promise<PendingScan[]> => {
  const pendingScans = [
    ...(await readPendingScans(riderUserId)).filter(({ scanId }) => scanId !== scan.scanId),
    { ...scan, state: PENDING_SCAN_STATE.WAITING, errorMessage: null },
  ];
  await writePendingScans(riderUserId, pendingScans);
  return pendingScans;
};

export const removePendingScan = async (
  riderUserId: string,
  scanIdToRemove: string,
): Promise<PendingScan[]> => {
  const pendingScans = (await readPendingScans(riderUserId)).filter(
    ({ scanId }) => scanId !== scanIdToRemove,
  );
  await writePendingScans(riderUserId, pendingScans);
  return pendingScans;
};

export const updatePendingScan = async (
  riderUserId: string,
  scanIdToUpdate: string,
  change: Pick<PendingScan, "state" | "errorMessage">,
): Promise<PendingScan[]> => {
  const pendingScans = (await readPendingScans(riderUserId)).map((pendingScan) =>
    pendingScan.scanId === scanIdToUpdate ? { ...pendingScan, ...change } : pendingScan,
  );
  await writePendingScans(riderUserId, pendingScans);
  return pendingScans;
};
