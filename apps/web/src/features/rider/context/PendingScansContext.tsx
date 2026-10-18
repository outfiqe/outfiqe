"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ApiClientError } from "@/shared/lib/apiClient";

import { riderApi } from "../api/riderApi";
import {
  PENDING_SCAN_RETRY_INTERVAL_MS,
  PENDING_SCAN_STATE,
  RETRYABLE_SCAN_ERROR_CODES,
} from "../constants/pendingScans";
import { RIDER_TASKS_QUERY_KEY } from "../constants/riderQueryKeys";
import {
  addPendingScan,
  type PendingScan,
  readPendingScans,
  removePendingScan,
  updatePendingScan,
} from "../utils/pendingScanQueue";

export const SCAN_OUTCOME = {
  COLLECTED: "collected",
  SAVED_OFFLINE: "saved-offline",
  REFUSED: "refused",
} as const;

export type ScanOutcome =
  | { kind: typeof SCAN_OUTCOME.COLLECTED }
  | { kind: typeof SCAN_OUTCOME.SAVED_OFFLINE }
  | { kind: typeof SCAN_OUTCOME.REFUSED; message: string };

type NewCollectScan = { taskId: string; pickupCode: string; bagTagCode: string };

type PendingScansContextValue = {
  pendingScans: PendingScan[];
  queueCollectScan: (scan: NewCollectScan) => Promise<ScanOutcome>;
  retryPendingScan: (scanId: string) => Promise<ScanOutcome>;
  discardPendingScan: (scanId: string) => Promise<void>;
};

const NO_UNSENT_SCANS = 0;

const PendingScansContext = createContext<PendingScansContextValue | null>(null);

const isRefusedByServer = (error: unknown): error is ApiClientError =>
  error instanceof ApiClientError && !RETRYABLE_SCAN_ERROR_CODES.has(error.code);

type PendingScansProviderProps = { riderUserId: string; children: ReactNode };

export const PendingScansProvider = ({ riderUserId, children }: PendingScansProviderProps) => {
  const queryClient = useQueryClient();
  const [pendingScans, setPendingScans] = useState<PendingScan[]>([]);
  const isSyncingRef = useRef(false);

  const sendPendingScan = useCallback(
    async (pendingScan: PendingScan): Promise<ScanOutcome> => {
      try {
        await riderApi.collectBag(pendingScan);
        setPendingScans(await removePendingScan(riderUserId, pendingScan.scanId));
        await queryClient.invalidateQueries({ queryKey: RIDER_TASKS_QUERY_KEY });
        return { kind: SCAN_OUTCOME.COLLECTED };
      } catch (error) {
        if (!isRefusedByServer(error)) return { kind: SCAN_OUTCOME.SAVED_OFFLINE };
        setPendingScans(
          await updatePendingScan(riderUserId, pendingScan.scanId, {
            state: PENDING_SCAN_STATE.FAILED,
            errorMessage: error.message,
          }),
        );
        return { kind: SCAN_OUTCOME.REFUSED, message: error.message };
      }
    },
    [queryClient, riderUserId],
  );

  const sendWaitingScans = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    try {
      const waitingScans = (await readPendingScans(riderUserId)).filter(
        ({ state }) => state === PENDING_SCAN_STATE.WAITING,
      );
      for (const waitingScan of waitingScans) {
        const { kind } = await sendPendingScan(waitingScan);
        if (kind === SCAN_OUTCOME.SAVED_OFFLINE) break;
      }
    } finally {
      isSyncingRef.current = false;
    }
  }, [riderUserId, sendPendingScan]);

  useEffect(() => {
    let isCancelled = false;
    void readPendingScans(riderUserId).then((storedScans) => {
      if (!isCancelled) setPendingScans(storedScans);
    });
    void sendWaitingScans();

    const retryTimer = setInterval(() => void sendWaitingScans(), PENDING_SCAN_RETRY_INTERVAL_MS);
    const sendWhenOnline = () => void sendWaitingScans();
    window.addEventListener("online", sendWhenOnline);
    return () => {
      isCancelled = true;
      clearInterval(retryTimer);
      window.removeEventListener("online", sendWhenOnline);
    };
  }, [riderUserId, sendWaitingScans]);

  const queueCollectScan = useCallback(
    async (scan: NewCollectScan): Promise<ScanOutcome> => {
      const scanRequest = {
        ...scan,
        scanId: crypto.randomUUID(),
        scannedAt: new Date().toISOString(),
      };
      const storedScans = await addPendingScan(riderUserId, scanRequest);
      setPendingScans(storedScans);
      return sendPendingScan({
        ...scanRequest,
        state: PENDING_SCAN_STATE.WAITING,
        errorMessage: null,
      });
    },
    [riderUserId, sendPendingScan],
  );

  const retryPendingScan = useCallback(
    async (scanId: string): Promise<ScanOutcome> => {
      const storedScans = await updatePendingScan(riderUserId, scanId, {
        state: PENDING_SCAN_STATE.WAITING,
        errorMessage: null,
      });
      setPendingScans(storedScans);
      const scanToRetry = storedScans.find((pendingScan) => pendingScan.scanId === scanId);
      return scanToRetry ? sendPendingScan(scanToRetry) : { kind: SCAN_OUTCOME.COLLECTED };
    },
    [riderUserId, sendPendingScan],
  );

  const discardPendingScan = useCallback(
    async (scanId: string) => {
      setPendingScans(await removePendingScan(riderUserId, scanId));
    },
    [riderUserId],
  );

  const contextValue = useMemo(
    () => ({ pendingScans, queueCollectScan, retryPendingScan, discardPendingScan }),
    [pendingScans, queueCollectScan, retryPendingScan, discardPendingScan],
  );

  return (
    <PendingScansContext.Provider value={contextValue}>{children}</PendingScansContext.Provider>
  );
};

export const useUnsentScanCount = (): number =>
  useContext(PendingScansContext)?.pendingScans.length ?? NO_UNSENT_SCANS;

export const usePendingScans = (): PendingScansContextValue => {
  const pendingScansContext = useContext(PendingScansContext);
  if (!pendingScansContext) {
    throw new Error("usePendingScans must be used within <PendingScansProvider>");
  }
  return pendingScansContext;
};
