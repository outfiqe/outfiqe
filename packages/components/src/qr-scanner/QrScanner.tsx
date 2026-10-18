import { Button, Input, Label } from "@outfiqe/design-system";
import { type FormEvent, useId, useState } from "react";

import { QR_SCANNER_STATUS, type QrScannerStatus } from "./qrScanner.types";
import { useQrScanner } from "./useQrScanner";

type QrScannerProps = {
  onCode: (code: string) => void;
  typedCodeLabel: string;
  isPaused?: boolean;
  className?: string;
};

const CAMERA_MESSAGES: Record<QrScannerStatus, string> = {
  [QR_SCANNER_STATUS.STARTING]: "Starting the camera…",
  [QR_SCANNER_STATUS.SCANNING]: "Point the camera at the code.",
  [QR_SCANNER_STATUS.CAMERA_DENIED]:
    "Camera access is blocked. Allow the camera in your browser settings, or type the code below.",
  [QR_SCANNER_STATUS.CAMERA_UNAVAILABLE]:
    "This phone's camera can't be used here. Type the code below instead.",
};

export const QrScanner = ({ onCode, typedCodeLabel, isPaused, className }: QrScannerProps) => {
  const { videoRef, canvasRef, status } = useQrScanner({ onDetect: onCode, isPaused });
  const [typedCode, setTypedCode] = useState("");
  const typedCodeInputId = useId();
  const isCameraOff =
    status === QR_SCANNER_STATUS.CAMERA_DENIED || status === QR_SCANNER_STATUS.CAMERA_UNAVAILABLE;

  const submitTypedCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedCode = typedCode.trim();
    if (!trimmedCode) return;
    onCode(trimmedCode);
    setTypedCode("");
  };

  return (
    <div className={className}>
      {!isCameraOff && (
        <video
          ref={videoRef}
          className="aspect-square w-full rounded-2xl bg-black object-cover"
          muted
          playsInline
          aria-label="Camera view for scanning"
        />
      )}
      <canvas ref={canvasRef} hidden />
      <p className="mt-2 text-sm text-muted-foreground" role="status" aria-live="polite">
        {CAMERA_MESSAGES[status]}
      </p>

      <form className="mt-4 flex items-end gap-2" onSubmit={submitTypedCode}>
        <div className="flex-1">
          <Label htmlFor={typedCodeInputId}>{typedCodeLabel}</Label>
          <Input
            id={typedCodeInputId}
            value={typedCode}
            onChange={(event) => setTypedCode(event.target.value)}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <Button type="submit" disabled={!typedCode.trim() || isPaused}>
          Use code
        </Button>
      </form>
    </div>
  );
};
