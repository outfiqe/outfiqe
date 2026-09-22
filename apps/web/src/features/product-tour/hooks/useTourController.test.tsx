import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TourProgress } from "../api/toursSchemas";
import { TOUR_OUTCOME } from "../constants/tourOutcome";
import { useRecordTourOutcome } from "./useRecordTourOutcome";
import { useTourController } from "./useTourController";
import { useTourProgress } from "./useTourProgress";

const TEST_TOUR_KEY = "brand-dashboard";
const CURRENT_VERSION = 3;

vi.mock("./useTourProgress", () => ({ useTourProgress: vi.fn() }));
vi.mock("./useRecordTourOutcome", () => ({ useRecordTourOutcome: vi.fn() }));

let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  usePathname: () => "/overview",
  useSearchParams: () => searchParams,
}));

const replaceState = vi.spyOn(window.history, "replaceState");

const recordOutcome = vi.fn();

const buildProgress = (overrides: Partial<TourProgress> = {}): TourProgress => ({
  tourKey: TEST_TOUR_KEY,
  version: CURRENT_VERSION,
  outcome: TOUR_OUTCOME.COMPLETED,
  updatedAt: "2026-09-01T00:00:00.000Z",
  ...overrides,
});

const mockTourProgress = (state: { tours?: TourProgress[]; isSuccess?: boolean }) => {
  const { tours = [], isSuccess = true } = state;
  vi.mocked(useTourProgress).mockReturnValue({
    data: isSuccess ? { tours } : undefined,
    isSuccess,
  } as ReturnType<typeof useTourProgress>);
};

const buildIdleRecordMutation = (): ReturnType<typeof useRecordTourOutcome> => ({
  context: undefined,
  data: undefined,
  error: null,
  failureCount: 0,
  failureReason: null,
  isPaused: false,
  status: "idle",
  variables: undefined,
  submittedAt: 0,
  isError: false,
  isIdle: true,
  isPending: false,
  isSuccess: false,
  mutate: recordOutcome,
  mutateAsync: vi.fn(),
  reset: vi.fn(),
});

const renderController = (isEligible = true) =>
  renderHook(() => useTourController(TEST_TOUR_KEY, CURRENT_VERSION, isEligible));

beforeEach(() => {
  vi.clearAllMocks();
  replaceState.mockClear();
  searchParams = new URLSearchParams();
  mockTourProgress({});
  vi.mocked(useRecordTourOutcome).mockReturnValue(buildIdleRecordMutation());
});

describe("useTourController — starting", () => {
  it("opens when eligible and nothing has been recorded", () => {
    const { result } = renderController(true);

    expect(result.current.isOpen).toBe(true);
    expect(result.current.stepIndex).toBe(0);
  });

  it("stays closed when not eligible", () => {
    const { result } = renderController(false);

    expect(result.current.isOpen).toBe(false);
  });

  it("stays closed once the current version was completed", () => {
    mockTourProgress({ tours: [buildProgress()] });

    const { result } = renderController(true);

    expect(result.current.isOpen).toBe(false);
  });

  it("stays closed once the current version was dismissed", () => {
    mockTourProgress({ tours: [buildProgress({ outcome: TOUR_OUTCOME.DISMISSED })] });

    const { result } = renderController(true);

    expect(result.current.isOpen).toBe(false);
  });

  it("opens again when the stored version is older than the current one", () => {
    mockTourProgress({ tours: [buildProgress({ version: CURRENT_VERSION - 1 })] });

    const { result } = renderController(true);

    expect(result.current.isOpen).toBe(true);
  });

  it("does not open while progress is still loading, or if it failed to load", () => {
    mockTourProgress({ isSuccess: false });

    const { result } = renderController(true);

    expect(result.current.isOpen).toBe(false);
  });
});

describe("useTourController — closing", () => {
  it("records completed and closes", () => {
    const { result } = renderController(true);

    act(() => result.current.closeTour("completed"));

    expect(recordOutcome).toHaveBeenCalledExactlyOnceWith({
      tourKey: TEST_TOUR_KEY,
      version: CURRENT_VERSION,
      outcome: TOUR_OUTCOME.COMPLETED,
    });
    expect(result.current.isOpen).toBe(false);
  });

  it("records dismissed and closes", () => {
    const { result } = renderController(true);

    act(() => result.current.closeTour("dismissed"));

    expect(recordOutcome).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ outcome: TOUR_OUTCOME.DISMISSED }),
    );
  });

  it("resets the step index back to the first step on close", () => {
    const { result } = renderController(true);
    act(() => result.current.setStepIndex(4));

    act(() => result.current.closeTour("dismissed"));

    expect(result.current.stepIndex).toBe(0);
  });

  it("does not save anything when the current version was already seen", () => {
    mockTourProgress({ tours: [buildProgress()] });
    const { result } = renderController(true);

    act(() => result.current.closeTour("dismissed"));

    expect(recordOutcome).not.toHaveBeenCalled();
  });
});

describe("useTourController — replay", () => {
  beforeEach(() => {
    searchParams = new URLSearchParams(`tour=${TEST_TOUR_KEY}`);
    mockTourProgress({ tours: [buildProgress()] });
  });

  it("opens from the first step even though the tour was already seen", () => {
    const { result } = renderController(true);

    expect(result.current.isOpen).toBe(true);
    expect(result.current.stepIndex).toBe(0);
  });

  it("removes the replay param from the URL without a router navigation", () => {
    renderController(true);

    expect(replaceState).toHaveBeenCalledExactlyOnceWith(null, "", "/overview");
  });

  it("keeps any other query params when removing the replay param", () => {
    searchParams = new URLSearchParams(`tour=${TEST_TOUR_KEY}&from=email`);

    renderController(true);

    expect(replaceState).toHaveBeenCalledExactlyOnceWith(null, "", "/overview?from=email");
  });

  it("does not open for someone who is not eligible", () => {
    const { result } = renderController(false);

    expect(result.current.isOpen).toBe(false);
  });

  it("ignores a tour query value for a different tour", () => {
    searchParams = new URLSearchParams("tour=some-other-tour");
    mockTourProgress({ tours: [buildProgress()] });

    const { result } = renderController(true);

    expect(result.current.isOpen).toBe(false);
    expect(replaceState).not.toHaveBeenCalled();
  });
});
