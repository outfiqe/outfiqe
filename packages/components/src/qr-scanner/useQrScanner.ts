import { type RefObject, useEffect, useRef, useState } from "react";

import { QR_SCANNER_STATUS, type QrScannerStatus } from "./qrScanner.types";
import { createQrFrameDecoder, isCameraPermissionError } from "./qrScanner.utils";

const SCAN_INTERVAL_MS = 250;
const SAME_CODE_COOLDOWN_MS = 2500;
const REAR_CAMERA = "environment";

type UseQrScannerOptions = {
  onDetect: (code: string) => void;
  isPaused?: boolean;
};

type UseQrScannerResult = {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  status: QrScannerStatus;
};

const stopStream = (stream: MediaStream | null) => {
  stream?.getTracks().forEach((track) => track.stop());
};

export const useQrScanner = ({
  onDetect,
  isPaused = false,
}: UseQrScannerOptions): UseQrScannerResult => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onDetectRef = useRef(onDetect);
  const isPausedRef = useRef(isPaused);
  const [status, setStatus] = useState<QrScannerStatus>(QR_SCANNER_STATUS.STARTING);

  useEffect(() => {
    onDetectRef.current = onDetect;
    isPausedRef.current = isPaused;
  }, [onDetect, isPaused]);

  useEffect(() => {
    let isStopped = false;
    let stream: MediaStream | null = null;
    let scanTimer: ReturnType<typeof setInterval> | undefined;
    let lastCode: { value: string; seenAt: number } | null = null;

    const reportCode = (code: string) => {
      const now = Date.now();
      const isRepeat = lastCode?.value === code && now - lastCode.seenAt < SAME_CODE_COOLDOWN_MS;
      lastCode = { value: code, seenAt: now };
      if (!isRepeat) onDetectRef.current(code);
    };

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus(QR_SCANNER_STATUS.CAMERA_UNAVAILABLE);
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: REAR_CAMERA },
          audio: false,
        });
      } catch (error) {
        setStatus(
          isCameraPermissionError(error)
            ? QR_SCANNER_STATUS.CAMERA_DENIED
            : QR_SCANNER_STATUS.CAMERA_UNAVAILABLE,
        );
        return;
      }
      const video = videoRef.current;
      if (isStopped || !video) {
        stopStream(stream);
        return;
      }
      video.srcObject = stream;
      await video.play().catch(() => undefined);
      const decodeFrame = await createQrFrameDecoder();
      if (isStopped) return;
      setStatus(QR_SCANNER_STATUS.SCANNING);

      let isDecoding = false;
      scanTimer = setInterval(() => {
        const canvas = canvasRef.current;
        if (isDecoding || isPausedRef.current || !canvas) return;
        isDecoding = true;
        void decodeFrame(video, canvas)
          .then((code) => {
            if (code && !isStopped) reportCode(code);
          })
          .finally(() => {
            isDecoding = false;
          });
      }, SCAN_INTERVAL_MS);
    };

    void startCamera();

    return () => {
      isStopped = true;
      clearInterval(scanTimer);
      stopStream(stream);
    };
  }, []);

  return { videoRef, canvasRef, status };
};
