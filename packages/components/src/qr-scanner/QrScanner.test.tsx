import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { QrScanner } from "./QrScanner";
import type { BarcodeDetectorConstructor } from "./qrScanner.types";

const SCANNED_CODE = "7K2M9QAB";
const SCAN_INTERVAL_MS = 250;
const VIDEO_WIDTH = 640;
const ONE_CALL = 1;

const stopTrack = vi.fn();

const fakeStream = { getTracks: () => [{ stop: stopTrack }] };

const installCamera = (getUserMedia: () => Promise<unknown>) => {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });
};

const installNativeDetector = (detectedValues: string[]) => {
  const NativeDetector = vi.fn(function NativeDetector() {
    return { detect: vi.fn(async () => detectedValues.map((rawValue) => ({ rawValue }))) };
  });
  const detectorConstructor: BarcodeDetectorConstructor = Object.assign(NativeDetector, {
    getSupportedFormats: async () => ["qr_code"],
  });
  globalThis.BarcodeDetector = detectorConstructor;
};

beforeEach(() => {
  Object.defineProperty(HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: () => Promise.resolve(),
  });
  Object.defineProperty(HTMLMediaElement.prototype, "readyState", {
    configurable: true,
    get: () => HTMLMediaElement.HAVE_ENOUGH_DATA,
  });
  Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", {
    configurable: true,
    get: () => VIDEO_WIDTH,
  });
  Object.defineProperty(HTMLMediaElement.prototype, "srcObject", {
    configurable: true,
    writable: true,
    value: null,
  });
});

afterEach(() => {
  globalThis.BarcodeDetector = undefined;
  vi.useRealTimers();
  stopTrack.mockReset();
});

describe("QrScanner", () => {
  it("reports a code the camera sees, once, and stops the camera when closed", async () => {
    installCamera(async () => fakeStream);
    installNativeDetector([SCANNED_CODE]);
    const onCode = vi.fn();

    const { unmount } = render(<QrScanner onCode={onCode} typedCodeLabel="Pickup code" />);

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Point the camera at the code."),
    );
    await waitFor(() => expect(onCode).toHaveBeenCalledWith(SCANNED_CODE), {
      timeout: SCAN_INTERVAL_MS * 8,
    });
    await act(() => new Promise((resolve) => setTimeout(resolve, SCAN_INTERVAL_MS * 3)));
    expect(onCode).toHaveBeenCalledTimes(ONE_CALL);

    unmount();
    expect(stopTrack).toHaveBeenCalled();
  });

  it("explains a blocked camera and still accepts a typed code", async () => {
    installCamera(async () => {
      throw new DOMException("Denied", "NotAllowedError");
    });
    const onCode = vi.fn();
    render(<QrScanner onCode={onCode} typedCodeLabel="Pickup code" />);

    expect(await screen.findByText(/Camera access is blocked/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Pickup code"), " 7k2m9qab ");
    await userEvent.click(screen.getByRole("button", { name: "Use code" }));

    expect(onCode).toHaveBeenCalledWith("7k2m9qab");
    expect(screen.getByLabelText("Pickup code")).toHaveValue("");
  });

  it("falls back to typing when the browser has no camera support", async () => {
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });

    render(<QrScanner onCode={vi.fn()} typedCodeLabel="Sticker code" />);

    expect(await screen.findByText(/camera can't be used here/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use code" })).toBeDisabled();
  });
});
