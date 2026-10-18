"use client";

import { Button, toast } from "@outfiqe/design-system";

import { PENDING_SCAN_STATE } from "../constants/pendingScans";
import { SCAN_OUTCOME, usePendingScans } from "../context/PendingScansContext";
import { describeScanCount } from "../utils/riderTask.utils";

const NO_PENDING_SCANS = 0;

export const PendingScansList = () => {
  const { pendingScans, retryPendingScan, discardPendingScan } = usePendingScans();
  if (pendingScans.length === NO_PENDING_SCANS) return null;

  const retryScan = async (scanId: string) => {
    const outcome = await retryPendingScan(scanId);
    if (outcome.kind === SCAN_OUTCOME.COLLECTED) toast.success("Scan sent.");
    if (outcome.kind === SCAN_OUTCOME.SAVED_OFFLINE)
      toast.error("Still offline. It will send later.");
  };

  return (
    <section
      aria-labelledby="pending-scans-heading"
      className="mb-5 rounded-2xl border border-border bg-muted p-4"
    >
      <h2 id="pending-scans-heading" className="text-sm font-semibold text-foreground">
        {describeScanCount(pendingScans.length)} not sent yet
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        They send on their own when you&apos;re back online. Keep the bags with you.
      </p>
      <ul className="mt-3 space-y-2">
        {pendingScans.map((pendingScan) => (
          <li key={pendingScan.scanId} className="rounded-xl bg-background p-3 text-sm">
            <p className="font-mono">
              {pendingScan.pickupCode} → {pendingScan.bagTagCode}
            </p>
            {pendingScan.state === PENDING_SCAN_STATE.FAILED ? (
              <>
                <p className="mt-1 text-destructive" role="alert">
                  {pendingScan.errorMessage}
                </p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={() => void retryScan(pendingScan.scanId)}>
                    Try again
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void discardPendingScan(pendingScan.scanId)}
                  >
                    Remove
                  </Button>
                </div>
              </>
            ) : (
              <p className="mt-1 text-muted-foreground">Waiting for signal…</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};
