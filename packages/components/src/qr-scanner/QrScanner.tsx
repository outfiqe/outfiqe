import { Button, Input, Label } from "@outfiqe/design-system";
import { Camera, CameraOff } from "lucide-react";
import { type FormEvent, useId, useState } from "react";

import { QrCameraView } from "./QrCameraView";
import { QR_CAMERA_START_MODE, type QrCameraStartMode } from "./qrScanner.types";

type QrScannerProps = {
  onCode: (code: string) => void;
  typedCodeLabel: string;
  isPaused?: boolean;
  cameraStartMode?: QrCameraStartMode;
  className?: string;
};

export const QrScanner = ({
  onCode,
  typedCodeLabel,
  isPaused,
  cameraStartMode = QR_CAMERA_START_MODE.AUTOMATIC,
  className,
}: QrScannerProps) => {
  const [isCameraOn, setIsCameraOn] = useState(cameraStartMode === QR_CAMERA_START_MODE.AUTOMATIC);
  const [typedCode, setTypedCode] = useState("");
  const typedCodeInputId = useId();
  const canTurnCameraOff = cameraStartMode === QR_CAMERA_START_MODE.ON_REQUEST;

  const submitTypedCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedCode = typedCode.trim();
    if (!trimmedCode) return;
    onCode(trimmedCode);
    setTypedCode("");
  };

  return (
    <div className={className}>
      {isCameraOn ? (
        <QrCameraView onCode={onCode} isPaused={isPaused} />
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setIsCameraOn(true)}
        >
          <Camera aria-hidden className="size-4" />
          Scan with camera
        </Button>
      )}
      {isCameraOn && canTurnCameraOff && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={() => setIsCameraOn(false)}
        >
          <CameraOff aria-hidden className="size-4" />
          Turn off camera
        </Button>
      )}

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
