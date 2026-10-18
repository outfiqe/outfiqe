import { QR_SCANNER_STATUS, type QrScannerStatus } from "./qrScanner.types";
import { useQrScanner } from "./useQrScanner";

type QrCameraViewProps = {
  onCode: (code: string) => void;
  isPaused?: boolean;
};

const CAMERA_MESSAGES: Record<QrScannerStatus, string> = {
  [QR_SCANNER_STATUS.STARTING]: "Starting the camera…",
  [QR_SCANNER_STATUS.SCANNING]: "Point the camera at the code.",
  [QR_SCANNER_STATUS.CAMERA_DENIED]:
    "Camera access is blocked. Allow the camera in your browser settings, or type the code below.",
  [QR_SCANNER_STATUS.CAMERA_UNAVAILABLE]:
    "This device's camera can't be used here. Type the code below instead.",
};

export const QrCameraView = ({ onCode, isPaused }: QrCameraViewProps) => {
  const { videoRef, canvasRef, status } = useQrScanner({ onDetect: onCode, isPaused });
  const isCameraBlocked =
    status === QR_SCANNER_STATUS.CAMERA_DENIED || status === QR_SCANNER_STATUS.CAMERA_UNAVAILABLE;

  return (
    <>
      {!isCameraBlocked && (
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
    </>
  );
};
