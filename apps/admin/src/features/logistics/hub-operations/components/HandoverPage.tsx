import { QR_CAMERA_START_MODE, QrScanner } from "@outfiqe/components";
import { Skeleton } from "@outfiqe/design-system";
import { formatParcelCode } from "@outfiqe/utils";
import { useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { HubPicker } from "../../components/HubPicker";
import { NoOpenHubsNotice } from "../../components/NoOpenHubsNotice";
import { useSelectedHub } from "../../hooks/useSelectedHub";
import { MAX_SCAN_RESULTS_SHOWN } from "../constants/hubOperationLabels";
import { SCAN_OUTCOME, type ScanLogEntry } from "../constants/scanOutcomes";
import { useHandOverParcel } from "../hooks/useHandOverParcel";
import { ScanLog } from "./ScanLog";

export const HandoverPage = () => {
  const { openHubs, selectedHub, selectHub, isLoadingHubs, hasHubsError, retryHubs } =
    useSelectedHub();
  const handOverParcel = useHandOverParcel();
  const [scanLog, setScanLog] = useState<ScanLogEntry[]>([]);

  const addToScanLog = (entry: Omit<ScanLogEntry, "id">) =>
    setScanLog((current) =>
      [{ ...entry, id: crypto.randomUUID() }, ...current].slice(0, MAX_SCAN_RESULTS_SHOWN),
    );

  const handOverScannedCode = (code: string) => {
    if (!selectedHub) return;
    handOverParcel.mutate(
      { hubId: selectedHub.id, code },
      {
        onSuccess: ({ trackingCode }) =>
          addToScanLog({
            outcome: SCAN_OUTCOME.DONE,
            title: formatParcelCode(trackingCode),
            detail: "Handed over to the partner.",
          }),
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
        <h1 className="font-display text-2xl font-bold text-foreground">Hand over parcels</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scan each parcel label as the partner&apos;s rider takes it. Parcels that aren&apos;t
          booked, or whose label shows old cash, are refused.
        </p>
      </div>

      {isLoadingHubs && <Skeleton className="h-16 w-full max-w-xs rounded-xl" />}
      {!isLoadingHubs && !selectedHub && (
        <NoOpenHubsNotice hasHubsError={hasHubsError} onRetry={retryHubs} />
      )}
      {selectedHub && (
        <>
          <HubPicker openHubs={openHubs} selectedHubId={selectedHub.id} onSelectHub={selectHub} />
          <QrScanner
            onCode={handOverScannedCode}
            typedCodeLabel="Parcel code"
            isPaused={handOverParcel.isPending}
            cameraStartMode={QR_CAMERA_START_MODE.ON_REQUEST}
            className="max-w-md"
          />
          <ScanLog entries={scanLog} emptyMessage="No parcels handed over yet." />
        </>
      )}
    </div>
  );
};
