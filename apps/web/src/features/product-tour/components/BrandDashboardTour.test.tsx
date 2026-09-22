import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth";

import type { TourProgress } from "../api/toursSchemas";
import type * as BrandDashboardTourConstants from "../constants/brandDashboardTour";
import { TOUR_OUTCOME } from "../constants/tourOutcome";
import { useRecordTourOutcome } from "../hooks/useRecordTourOutcome";
import { useTourProgress } from "../hooks/useTourProgress";
import { BrandDashboardTour } from "./BrandDashboardTour";

const { CURRENT_TOUR_VERSION } = vi.hoisted(() => ({ CURRENT_TOUR_VERSION: 2 }));
const WELCOME_TITLE = "Welcome to your brand dashboard";

vi.mock("@/features/auth", () => ({ useAuth: vi.fn() }));
vi.mock("../hooks/useTourProgress", () => ({ useTourProgress: vi.fn() }));
vi.mock("../hooks/useRecordTourOutcome", () => ({ useRecordTourOutcome: vi.fn() }));

vi.mock("../constants/brandDashboardTour", async (importOriginal) => {
  const actual = await importOriginal<typeof BrandDashboardTourConstants>();
  return { ...actual, BRAND_DASHBOARD_TOUR_VERSION: CURRENT_TOUR_VERSION };
});

let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  usePathname: () => "/overview",
  useSearchParams: () => searchParams,
}));

const replaceState = vi.spyOn(window.history, "replaceState");

const recordOutcome = vi.fn();

const buildProgress = (overrides: Partial<TourProgress> = {}): TourProgress => ({
  tourKey: "brand-dashboard",
  version: CURRENT_TOUR_VERSION,
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

const mockAuth = (isBrandOwner: boolean) => {
  vi.mocked(useAuth).mockReturnValue({ isBrandOwner } as ReturnType<typeof useAuth>);
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

const openedTour = () => screen.queryByRole("dialog", { name: WELCOME_TITLE });

beforeEach(() => {
  vi.clearAllMocks();
  replaceState.mockClear();
  searchParams = new URLSearchParams();
  mockAuth(true);
  mockTourProgress({});
  vi.mocked(useRecordTourOutcome).mockReturnValue(buildIdleRecordMutation());
});

describe("BrandDashboardTour — starting", () => {
  it("opens by itself for a brand owner who has never seen the tour", () => {
    render(<BrandDashboardTour />);

    expect(openedTour()).toBeInTheDocument();
    expect(screen.getByText("1 of 8")).toBeInTheDocument();
  });

  it("stays closed once the current version was finished", () => {
    mockTourProgress({ tours: [buildProgress()] });

    render(<BrandDashboardTour />);

    expect(openedTour()).not.toBeInTheDocument();
  });

  it("stays closed once the current version was skipped", () => {
    mockTourProgress({ tours: [buildProgress({ outcome: TOUR_OUTCOME.DISMISSED })] });

    render(<BrandDashboardTour />);

    expect(openedTour()).not.toBeInTheDocument();
  });

  it("opens again when the tour has a newer version than the one last seen", () => {
    mockTourProgress({ tours: [buildProgress({ version: CURRENT_TOUR_VERSION - 1 })] });

    render(<BrandDashboardTour />);

    expect(openedTour()).toBeInTheDocument();
  });

  it("ignores progress saved for a different tour", () => {
    mockTourProgress({ tours: [buildProgress({ tourKey: "creator-dashboard" })] });

    render(<BrandDashboardTour />);

    expect(openedTour()).toBeInTheDocument();
  });

  it("does not open while the saved progress is still loading, or if it failed to load", () => {
    mockTourProgress({ isSuccess: false });

    render(<BrandDashboardTour />);

    expect(openedTour()).not.toBeInTheDocument();
  });

  it("does not open for anyone who is not a brand owner", () => {
    mockAuth(false);

    render(<BrandDashboardTour />);

    expect(openedTour()).not.toBeInTheDocument();
  });
});

describe("BrandDashboardTour — finishing", () => {
  const clickThroughToTheLastStep = () => {
    for (let step = 1; step < 8; step += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    }
  };

  it("records COMPLETED and closes when the last step is finished", () => {
    render(<BrandDashboardTour />);

    clickThroughToTheLastStep();
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));

    expect(recordOutcome).toHaveBeenCalledExactlyOnceWith({
      tourKey: "brand-dashboard",
      version: CURRENT_TOUR_VERSION,
      outcome: TOUR_OUTCOME.COMPLETED,
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("records DISMISSED and closes when skipped part-way", () => {
    render(<BrandDashboardTour />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    fireEvent.click(screen.getByRole("button", { name: "Skip tour" }));

    expect(recordOutcome).toHaveBeenCalledExactlyOnceWith({
      tourKey: "brand-dashboard",
      version: CURRENT_TOUR_VERSION,
      outcome: TOUR_OUTCOME.DISMISSED,
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("records DISMISSED when Escape is pressed", () => {
    render(<BrandDashboardTour />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(recordOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: TOUR_OUTCOME.DISMISSED }),
    );
  });

  it("closes right away even while the saved progress still says the tour is unseen", () => {
    mockTourProgress({ tours: [] });
    render(<BrandDashboardTour />);

    fireEvent.click(screen.getByRole("button", { name: "Skip tour" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("BrandDashboardTour — replay", () => {
  beforeEach(() => {
    searchParams = new URLSearchParams("tour=brand-dashboard");
    mockTourProgress({ tours: [buildProgress()] });
  });

  it("opens from the first step even though the tour was already seen, and cleans the URL without a router navigation", () => {
    render(<BrandDashboardTour />);

    expect(openedTour()).toBeInTheDocument();
    expect(replaceState).toHaveBeenCalledExactlyOnceWith(null, "", "/overview");
  });

  it("does not save anything when a replay is closed, because the tour was already seen", () => {
    render(<BrandDashboardTour />);

    fireEvent.click(screen.getByRole("button", { name: "Skip tour" }));

    expect(recordOutcome).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("restarts from the first step when replayed again after being closed part-way", () => {
    const { rerender } = render(<BrandDashboardTour />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("2 of 8")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Skip tour" }));

    searchParams = new URLSearchParams();
    rerender(<BrandDashboardTour />);
    searchParams = new URLSearchParams("tour=brand-dashboard");
    rerender(<BrandDashboardTour />);

    expect(screen.getByText("1 of 8")).toBeInTheDocument();
  });

  it("ignores a tour query value it does not know", () => {
    searchParams = new URLSearchParams("tour=something-else");

    render(<BrandDashboardTour />);

    expect(openedTour()).not.toBeInTheDocument();
    expect(replaceState).not.toHaveBeenCalled();
  });

  it("does not open for a non-brand owner even if the link is followed", () => {
    mockAuth(false);

    render(<BrandDashboardTour />);

    expect(openedTour()).not.toBeInTheDocument();
  });

  it("saves the outcome when a replay is closed before the first run was ever recorded", () => {
    mockTourProgress({ tours: [] });

    render(<BrandDashboardTour />);
    fireEvent.click(screen.getByRole("button", { name: "Skip tour" }));

    expect(recordOutcome).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ outcome: TOUR_OUTCOME.DISMISSED }),
    );
  });
});
