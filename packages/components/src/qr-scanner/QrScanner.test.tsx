import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { QrScanner } from "./QrScanner";
import { type BarcodeDetectorConstructor, QR_CAMERA_START_MODE } from "./qrScanner.types";

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

  it("keeps the camera off until asked, then turns it off again on request", async () => {
    const getUserMedia = vi.fn(async () => fakeStream);
    installCamera(getUserMedia);
    installNativeDetector([]);
    const onCode = vi.fn();
    render(
      <QrScanner
        onCode={onCode}
        typedCodeLabel="Sticker code"
        cameraStartMode={QR_CAMERA_START_MODE.ON_REQUEST}
      />,
    );

    expect(screen.queryByLabelText("Camera view for scanning")).not.toBeInTheDocument();
    expect(getUserMedia).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText("Sticker code"), "ABCDEFGHJK");
    await userEvent.click(screen.getByRole("button", { name: "Use code" }));
    expect(onCode).toHaveBeenCalledWith("ABCDEFGHJK");

    await userEvent.click(screen.getByRole("button", { name: "Scan with camera" }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Point the camera at the code."),
    );
    expect(getUserMedia).toHaveBeenCalledTimes(ONE_CALL);

    await userEvent.click(screen.getByRole("button", { name: "Turn off camera" }));
    expect(stopTrack).toHaveBeenCalled();
    expect(screen.queryByLabelText("Camera view for scanning")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Scan with camera" })).toBeInTheDocument();
  });

  it("starts the camera straight away by default, with no button to turn it off", async () => {
    installCamera(async () => fakeStream);
    installNativeDetector([]);
    render(<QrScanner onCode={vi.fn()} typedCodeLabel="Pickup code" />);

    expect(await screen.findByLabelText("Camera view for scanning")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Turn off camera" })).not.toBeInTheDocument();
  });

  it("falls back to typing when the browser has no camera support", async () => {
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });

    render(<QrScanner onCode={vi.fn()} typedCodeLabel="Sticker code" />);

    expect(await screen.findByText(/camera can't be used here/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use code" })).toBeDisabled();
  });
});
