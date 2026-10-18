import { afterEach, describe, expect, it, vi } from "vitest";

import type { BarcodeDetectorConstructor } from "./qrScanner.types";
import { createQrFrameDecoder, isCameraPermissionError } from "./qrScanner.utils";

const jsQrMock = vi.hoisted(() => vi.fn());
vi.mock("jsqr", () => ({ default: jsQrMock }));

const FRAME_SIZE = 4;
const RGBA_CHANNELS = 4;

const buildReadyVideo = () => {
  const video = document.createElement("video");
  Object.defineProperty(video, "readyState", { value: HTMLMediaElement.HAVE_ENOUGH_DATA });
  Object.defineProperty(video, "videoWidth", { value: FRAME_SIZE });
  Object.defineProperty(video, "videoHeight", { value: FRAME_SIZE });
  return video;
};

const buildCanvas = () => {
  const canvas = document.createElement("canvas");
  const pixels = new Uint8ClampedArray(FRAME_SIZE * FRAME_SIZE * RGBA_CHANNELS);
  Object.defineProperty(canvas, "getContext", {
    value: () => ({
      drawImage: vi.fn(),
      getImageData: () => ({ data: pixels, width: FRAME_SIZE, height: FRAME_SIZE }),
    }),
  });
  return canvas;
};

const installDetector = (
  supportedFormats: string[],
  detect: () => Promise<{ rawValue: string }[]>,
) => {
  const NativeDetector = vi.fn(function NativeDetector() {
    return { detect };
  });
  const detectorConstructor: BarcodeDetectorConstructor = Object.assign(NativeDetector, {
    getSupportedFormats: async () => supportedFormats,
  });
  globalThis.BarcodeDetector = detectorConstructor;
};

afterEach(() => {
  globalThis.BarcodeDetector = undefined;
  jsQrMock.mockReset();
});

describe("createQrFrameDecoder", () => {
  it("uses the browser's own QR reader when it has one", async () => {
    installDetector(["qr_code"], async () => [{ rawValue: "NATIVE01" }]);

    const decodeFrame = await createQrFrameDecoder();

    expect(await decodeFrame(buildReadyVideo(), buildCanvas())).toBe("NATIVE01");
    expect(jsQrMock).not.toHaveBeenCalled();
  });

  it("reads the frame itself when the browser can't read QR codes", async () => {
    installDetector(["ean_13"], async () => []);
    jsQrMock.mockReturnValue({ data: "FALLBACK" });

    const decodeFrame = await createQrFrameDecoder();

    expect(await decodeFrame(buildReadyVideo(), buildCanvas())).toBe("FALLBACK");
  });

  it("falls back when the browser's reader fails on a frame", async () => {
    installDetector(["qr_code"], async () => {
      throw new Error("detector crashed");
    });
    jsQrMock.mockReturnValue(null);

    const decodeFrame = await createQrFrameDecoder();

    expect(await decodeFrame(buildReadyVideo(), buildCanvas())).toBeNull();
    expect(jsQrMock).toHaveBeenCalled();
  });

  it("waits until the video has a frame", async () => {
    const decodeFrame = await createQrFrameDecoder();

    expect(await decodeFrame(document.createElement("video"), buildCanvas())).toBeNull();
  });
});

describe("isCameraPermissionError", () => {
  it("recognises a refused camera", () => {
    expect(isCameraPermissionError(new DOMException("No", "NotAllowedError"))).toBe(true);
    expect(isCameraPermissionError(new DOMException("No", "NotFoundError"))).toBe(false);
  });
});
