import { QR_CAMERA_START_MODE, QrScanner } from "@outfiqe/components";
import { Input, Label, Skeleton } from "@outfiqe/design-system";
import { useId, useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { HubPicker } from "../../components/HubPicker";
import { NoOpenHubsNotice } from "../../components/NoOpenHubsNotice";
import { useSelectedHub } from "../../hooks/useSelectedHub";
import { MAX_SCAN_RESULTS_SHOWN } from "../constants/hubOperationLabels";
import { SCAN_OUTCOME, type ScanLogEntry } from "../constants/scanOutcomes";
import { useCheckInPickup } from "../hooks/useCheckInPickup";
import { ScanLog } from "./ScanLog";

const MIN_COUNTED_UNITS = 0;

export const CheckInPage = () => {
  const { openHubs, selectedHub, selectHub, isLoadingHubs, hasHubsError, retryHubs } =
    useSelectedHub();
  const checkInPickup = useCheckInPickup();
  const [countedUnits, setCountedUnits] = useState("");
  const [scanLog, setScanLog] = useState<ScanLogEntry[]>([]);
  const countedUnitsInputId = useId();
  const parsedCountedUnits = Number(countedUnits);
  const hasCount = countedUnits !== "" && parsedCountedUnits >= MIN_COUNTED_UNITS;

  const addToScanLog = (entry: Omit<ScanLogEntry, "id">) =>
    setScanLog((current) =>
      [{ ...entry, id: crypto.randomUUID() }, ...current].slice(0, MAX_SCAN_RESULTS_SHOWN),
    );

  const checkInScannedCode = (code: string) => {
    if (!selectedHub || !hasCount) return;
    checkInPickup.mutate(
      { hubId: selectedHub.id, code, countedUnits: parsedCountedUnits },
      {
        onSuccess: ({ brandName, expectedUnits, countedUnits: counted, hasCountMismatch }) => {
          addToScanLog({
            outcome: hasCountMismatch ? SCAN_OUTCOME.NEEDS_ATTENTION : SCAN_OUTCOME.DONE,
            title: `${brandName} checked in`,
            detail: hasCountMismatch
              ? `Counted ${counted} of ${expectedUnits} units. The difference has been recorded.`
              : `${expectedUnits} units, all there.`,
          });
          setCountedUnits("");
        },
        onError: (error) =>
          addToScanLog({
            outcome: SCAN_OUTCOME.REFUSED,
            title: code,
            detail: getErrorMessage(error),
          }),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Check in bags</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Count the units in each bag riders bring in, then scan its sticker or pickup slip.
        </p>
      </div>

      {isLoadingHubs && <Skeleton className="h-16 w-full max-w-xs rounded-xl" />}
      {!isLoadingHubs && !selectedHub && (
        <NoOpenHubsNotice hasHubsError={hasHubsError} onRetry={retryHubs} />
      )}
      {selectedHub && (
        <>
          <HubPicker openHubs={openHubs} selectedHubId={selectedHub.id} onSelectHub={selectHub} />
          <div className="max-w-xs">
            <Label htmlFor={countedUnitsInputId}>Units in this bag</Label>
            <Input
              id={countedUnitsInputId}
              type="number"
              inputMode="numeric"
              min={MIN_COUNTED_UNITS}
              value={countedUnits}
              onChange={(event) => setCountedUnits(event.target.value)}
            />
          </div>
          {!hasCount && (
            <p className="text-sm text-muted-foreground" role="status">
              Enter how many units are in the bag to start scanning.
            </p>
          )}
          <QrScanner
            onCode={checkInScannedCode}
            typedCodeLabel="Sticker or pickup code"
            isPaused={checkInPickup.isPending || !hasCount}
            cameraStartMode={QR_CAMERA_START_MODE.ON_REQUEST}
            className="max-w-md"
          />
          <ScanLog entries={scanLog} emptyMessage="No bags checked in yet." />
        </>
      )}
    </div>
  );
};
