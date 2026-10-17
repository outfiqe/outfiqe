import jsQR from "jsqr";

import type { QrFrameDecoder } from "./qrScanner.types";

const QR_CODE_FORMAT = "qr_code";
const VIDEO_HAS_CURRENT_FRAME = 2;
const NO_PIXELS = 0;
const FIRST_BARCODE_INDEX = 0;

const hasVideoFrame = (video: HTMLVideoElement) =>
  video.readyState >= VIDEO_HAS_CURRENT_FRAME && video.videoWidth > NO_PIXELS;

const decodeWithJsQr: QrFrameDecoder = async (video, canvas) => {
  if (!hasVideoFrame(video)) return null;
  const { videoWidth, videoHeight } = video;
  canvas.width = videoWidth;
  canvas.height = videoHeight;
  const drawingContext = canvas.getContext("2d", { willReadFrequently: true });
  if (!drawingContext) return null;
  drawingContext.drawImage(video, NO_PIXELS, NO_PIXELS, videoWidth, videoHeight);
  const { data, width, height } = drawingContext.getImageData(
    NO_PIXELS,
    NO_PIXELS,
    videoWidth,
    videoHeight,
  );
  return jsQR(data, width, height)?.data ?? null;
};

const supportsNativeQrDetection = async (): Promise<boolean> => {
  const NativeBarcodeDetector = globalThis.BarcodeDetector;
  if (!NativeBarcodeDetector) return false;
  try {
    return (await NativeBarcodeDetector.getSupportedFormats()).includes(QR_CODE_FORMAT);
  } catch {
    return false;
  }
};

export const createQrFrameDecoder = async (): Promise<QrFrameDecoder> => {
  const NativeBarcodeDetector = globalThis.BarcodeDetector;
  if (!NativeBarcodeDetector || !(await supportsNativeQrDetection())) return decodeWithJsQr;

  const detector = new NativeBarcodeDetector({ formats: [QR_CODE_FORMAT] });
  return async (video, canvas) => {
    if (!hasVideoFrame(video)) return null;
    try {
      const barcodes = await detector.detect(video);
      return barcodes[FIRST_BARCODE_INDEX]?.rawValue ?? null;
    } catch {
      return decodeWithJsQr(video, canvas);
    }
  };
};

export const isCameraPermissionError = (error: unknown): boolean =>
  error instanceof DOMException &&
  (error.name === "NotAllowedError" || error.name === "SecurityError");
