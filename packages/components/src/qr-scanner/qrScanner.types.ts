export type DetectedBarcode = { rawValue: string };

export type BarcodeDetectorInstance = {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
};

export type BarcodeDetectorConstructor = {
  new (options: { formats: string[] }): BarcodeDetectorInstance;
  getSupportedFormats: () => Promise<string[]>;
};

declare global {
  var BarcodeDetector: BarcodeDetectorConstructor | undefined;
}

export const QR_SCANNER_STATUS = {
  STARTING: "starting",
  SCANNING: "scanning",
  CAMERA_DENIED: "camera-denied",
  CAMERA_UNAVAILABLE: "camera-unavailable",
} as const;

export type QrScannerStatus = (typeof QR_SCANNER_STATUS)[keyof typeof QR_SCANNER_STATUS];

export type QrFrameDecoder = (
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
) => Promise<string | null>;
