"use client";

import { QrScanner } from "@outfiqe/components";
import { Button, toast } from "@outfiqe/design-system";
import {
  BAG_TAG_CODE_LENGTH,
  isCrockfordCode,
  normalizeTypedCode,
  PICKUP_CODE_LENGTH,
} from "@outfiqe/utils";
import { useState } from "react";

import { SCAN_OUTCOME, usePendingScans } from "../context/PendingScansContext";

const SCAN_STEP = {
  PICKUP_CODE: "pickup-code",
  BAG_TAG: "bag-tag",
} as const;

type ScanStep = (typeof SCAN_STEP)[keyof typeof SCAN_STEP];

type CollectScanFlowProps = { taskId: string };

export const CollectScanFlow = ({ taskId }: CollectScanFlowProps) => {
  const { queueCollectScan } = usePendingScans();
  const [scanStep, setScanStep] = useState<ScanStep>(SCAN_STEP.PICKUP_CODE);
  const [pickupCode, setPickupCode] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [scanHint, setScanHint] = useState<string | null>(null);

  const startOver = () => {
    setPickupCode(null);
    setScanStep(SCAN_STEP.PICKUP_CODE);
    setScanHint(null);
  };

  const sendCollectScan = async (scannedPickupCode: string, bagTagCode: string) => {
    setIsSending(true);
    const outcome = await queueCollectScan({ taskId, pickupCode: scannedPickupCode, bagTagCode });
    setIsSending(false);
    if (outcome.kind === SCAN_OUTCOME.COLLECTED) toast.success("Bag collected.");
    if (outcome.kind === SCAN_OUTCOME.SAVED_OFFLINE) {
      toast.success("No signal. Scan saved on this phone and will send later.");
    }
    if (outcome.kind === SCAN_OUTCOME.REFUSED) toast.error(outcome.message);
    startOver();
  };

  const acceptScannedCode = (rawCode: string) => {
    const code = normalizeTypedCode(rawCode);
    if (scanStep === SCAN_STEP.PICKUP_CODE) {
      if (isCrockfordCode(code, BAG_TAG_CODE_LENGTH)) {
        setScanHint("That's a bag sticker. Scan the brand's pickup slip first.");
        return;
      }
      if (!isCrockfordCode(code, PICKUP_CODE_LENGTH)) {
        setScanHint("That isn't an Outfiqe pickup code. Try again.");
        return;
      }
      setPickupCode(code);
      setScanStep(SCAN_STEP.BAG_TAG);
      setScanHint(null);
      return;
    }
    if (!isCrockfordCode(code, BAG_TAG_CODE_LENGTH)) {
      setScanHint("That isn't a bag sticker. Scan the sticker you put on the bag.");
      return;
    }
    if (pickupCode) void sendCollectScan(pickupCode, code);
  };

  const isPickupStep = scanStep === SCAN_STEP.PICKUP_CODE;

  return (
    <section
      aria-labelledby="collect-scan-heading"
      className="rounded-2xl border border-border p-4"
    >
      <h2 id="collect-scan-heading" className="font-semibold text-foreground">
        {isPickupStep ? "Step 1: scan the pickup slip" : "Step 2: scan the sticker on the bag"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {isPickupStep
          ? "The brand shows a QR code on their screen or printed slip."
          : `Pickup ${pickupCode} found. Stick a new bag sticker on the bag and scan it.`}
      </p>

      <QrScanner
        key={scanStep}
        className="mt-3"
        onCode={acceptScannedCode}
        isPaused={isSending}
        typedCodeLabel={isPickupStep ? "Or type the pickup code" : "Or type the sticker code"}
      />

      {scanHint && (
        <p className="mt-2 text-sm font-medium text-destructive" role="alert">
          {scanHint}
        </p>
      )}

      {!isPickupStep && (
        <Button variant="ghost" className="mt-3" onClick={startOver} disabled={isSending}>
          Start this bag again
        </Button>
      )}
    </section>
  );
};
