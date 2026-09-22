import { renderWithRouter } from "@test/renderWithRouter";
import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TourProgress } from "../api/toursSchemas";
import { TOUR_OUTCOME } from "../constants/tourOutcome";
import { useRecordTourOutcome } from "./useRecordTourOutcome";
import { useTourController } from "./useTourController";
import { useTourProgress } from "./useTourProgress";

const TEST_TOUR_KEY = "crm-dashboard";
const CURRENT_VERSION = 3;

vi.mock("./useTourProgress", () => ({ useTourProgress: vi.fn() }));
vi.mock("./useRecordTourOutcome", () => ({ useRecordTourOutcome: vi.fn() }));

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

const ControllerProbe = ({ isEligible = true }: { isEligible?: boolean }) => {
  const { isOpen, stepIndex, setStepIndex, closeTour } = useTourController(
    TEST_TOUR_KEY,
    CURRENT_VERSION,
    isEligible,
  );
  return (
    <div>
      <p data-testid="is-open">{String(isOpen)}</p>
      <p data-testid="step-index">{stepIndex}</p>
      <button type="button" onClick={() => setStepIndex(4)}>
        jump
      </button>
      <button type="button" onClick={() => closeTour("completed")}>
        complete
      </button>
      <button type="button" onClick={() => closeTour("dismissed")}>
        dismiss
      </button>
    </div>
  );
};

const renderController = (options: { isEligible?: boolean; initialEntry?: string } = {}) =>
  renderWithRouter(<ControllerProbe isEligible={options.isEligible} />, {
    path: "/crm",
    initialEntry: options.initialEntry ?? "/crm",
  });

beforeEach(() => {
  vi.clearAllMocks();
  mockTourProgress({});
  vi.mocked(useRecordTourOutcome).mockReturnValue(buildIdleRecordMutation());
});

describe("useTourController — starting", () => {
  it("opens when eligible and nothing has been recorded", async () => {
    renderController();

    expect(await screen.findByTestId("is-open")).toHaveTextContent("true");
    expect(screen.getByTestId("step-index")).toHaveTextContent("0");
  });

  it("stays closed when not eligible", async () => {
    renderController({ isEligible: false });

    expect(await screen.findByTestId("is-open")).toHaveTextContent("false");
  });

  it("stays closed once the current version was completed", async () => {
    mockTourProgress({ tours: [buildProgress()] });

    renderController();

    expect(await screen.findByTestId("is-open")).toHaveTextContent("false");
  });

  it("opens again when the stored version is older than the current one", async () => {
    mockTourProgress({ tours: [buildProgress({ version: CURRENT_VERSION - 1 })] });

    renderController();

    expect(await screen.findByTestId("is-open")).toHaveTextContent("true");
  });

  it("does not open while progress is still loading, or if it failed to load", async () => {
    mockTourProgress({ isSuccess: false });

    renderController();

    expect(await screen.findByTestId("is-open")).toHaveTextContent("false");
  });
});

describe("useTourController — closing", () => {
  it("records completed and closes", async () => {
    renderController();
    await screen.findByTestId("is-open");

    fireEvent.click(screen.getByRole("button", { name: "complete" }));

    expect(recordOutcome).toHaveBeenCalledExactlyOnceWith({
      tourKey: TEST_TOUR_KEY,
      version: CURRENT_VERSION,
      outcome: TOUR_OUTCOME.COMPLETED,
    });
    expect(screen.getByTestId("is-open")).toHaveTextContent("false");
  });

  it("records dismissed and closes", async () => {
    renderController();
    await screen.findByTestId("is-open");

    fireEvent.click(screen.getByRole("button", { name: "dismiss" }));

    expect(recordOutcome).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ outcome: TOUR_OUTCOME.DISMISSED }),
    );
  });

  it("resets the step index back to the first step on close", async () => {
    renderController();
    await screen.findByTestId("is-open");
    fireEvent.click(screen.getByRole("button", { name: "jump" }));
    expect(screen.getByTestId("step-index")).toHaveTextContent("4");

    fireEvent.click(screen.getByRole("button", { name: "dismiss" }));

    expect(screen.getByTestId("step-index")).toHaveTextContent("0");
  });

  it("does not save anything when the current version was already seen", async () => {
    mockTourProgress({ tours: [buildProgress()] });
    renderController();
    await screen.findByTestId("is-open");

    fireEvent.click(screen.getByRole("button", { name: "dismiss" }));

    expect(recordOutcome).not.toHaveBeenCalled();
  });
});

describe("useTourController — replay", () => {
  beforeEach(() => {
    mockTourProgress({ tours: [buildProgress()] });
  });

  it("opens from the first step even though the tour was already seen", async () => {
    renderController({ initialEntry: `/crm?tour=${TEST_TOUR_KEY}` });

    expect(await screen.findByTestId("is-open")).toHaveTextContent("true");
    expect(screen.getByTestId("step-index")).toHaveTextContent("0");
  });

  it("removes the replay param from the URL without adding a history entry", async () => {
    const { router } = renderController({ initialEntry: `/crm?tour=${TEST_TOUR_KEY}` });
    const lengthBefore = router.history.length;

    await screen.findByTestId("is-open");

    expect(router.state.location.search).toEqual({});
    expect(router.history.length).toBe(lengthBefore);
  });

  it("does not open for someone who is not eligible", async () => {
    renderController({ initialEntry: `/crm?tour=${TEST_TOUR_KEY}`, isEligible: false });

    expect(await screen.findByTestId("is-open")).toHaveTextContent("false");
  });

  it("ignores a tour query value for a different tour", async () => {
    const { router } = renderController({ initialEntry: "/crm?tour=some-other-tour" });

    expect(await screen.findByTestId("is-open")).toHaveTextContent("false");
    expect(router.state.location.search).toEqual({ tour: "some-other-tour" });
  });
});
