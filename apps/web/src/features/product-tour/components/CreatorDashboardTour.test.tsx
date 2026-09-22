import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth";

import type { TourProgress } from "../api/toursSchemas";
import type * as CreatorDashboardTourConstants from "../constants/creatorDashboardTour";
import { TOUR_OUTCOME } from "../constants/tourOutcome";
import { useRecordTourOutcome } from "../hooks/useRecordTourOutcome";
import { useTourProgress } from "../hooks/useTourProgress";
import { CreatorDashboardTour } from "./CreatorDashboardTour";

const { CURRENT_TOUR_VERSION } = vi.hoisted(() => ({ CURRENT_TOUR_VERSION: 2 }));
const WELCOME_TITLE = "Welcome to your creator dashboard";
const LAST_STEP_INDEX_LABEL = "10 of 10";

vi.mock("@/features/auth", () => ({ useAuth: vi.fn() }));
vi.mock("../hooks/useTourProgress", () => ({ useTourProgress: vi.fn() }));
vi.mock("../hooks/useRecordTourOutcome", () => ({ useRecordTourOutcome: vi.fn() }));

vi.mock("../constants/creatorDashboardTour", async (importOriginal) => {
  const actual = await importOriginal<typeof CreatorDashboardTourConstants>();
  return { ...actual, CREATOR_DASHBOARD_TOUR_VERSION: CURRENT_TOUR_VERSION };
});

let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  usePathname: () => "/overview",
  useSearchParams: () => searchParams,
}));

const replaceState = vi.spyOn(window.history, "replaceState");

const recordOutcome = vi.fn();

const buildProgress = (overrides: Partial<TourProgress> = {}): TourProgress => ({
  tourKey: "creator-dashboard",
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

const mockAuth = (isCreator: boolean) => {
  vi.mocked(useAuth).mockReturnValue({ isCreator } as ReturnType<typeof useAuth>);
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

describe("CreatorDashboardTour", () => {
  it("opens by itself for an approved creator who has never seen the tour", () => {
    render(<CreatorDashboardTour />);

    expect(openedTour()).toBeInTheDocument();
    expect(screen.getByText("1 of 10")).toBeInTheDocument();
  });

  it("stays closed once the current version was finished", () => {
    mockTourProgress({ tours: [buildProgress()] });

    render(<CreatorDashboardTour />);

    expect(openedTour()).not.toBeInTheDocument();
  });

  it("does not open for anyone who is not an approved creator", () => {
    mockAuth(false);

    render(<CreatorDashboardTour />);

    expect(openedTour()).not.toBeInTheDocument();
  });

  it("ignores progress saved for a different tour", () => {
    mockTourProgress({ tours: [buildProgress({ tourKey: "brand-dashboard" })] });

    render(<CreatorDashboardTour />);

    expect(openedTour()).toBeInTheDocument();
  });

  it("walks through every step ending on a Finish button", () => {
    render(<CreatorDashboardTour />);

    for (let step = 1; step < 10; step += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    }

    expect(screen.getByText(LAST_STEP_INDEX_LABEL)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finish" })).toBeInTheDocument();
  });

  it("records COMPLETED with the creator-dashboard tour key when finished", () => {
    render(<CreatorDashboardTour />);

    for (let step = 1; step < 10; step += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    }
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));

    expect(recordOutcome).toHaveBeenCalledExactlyOnceWith({
      tourKey: "creator-dashboard",
      version: CURRENT_TOUR_VERSION,
      outcome: TOUR_OUTCOME.COMPLETED,
    });
  });

  it("records DISMISSED when skipped part-way", () => {
    render(<CreatorDashboardTour />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    fireEvent.click(screen.getByRole("button", { name: "Skip tour" }));

    expect(recordOutcome).toHaveBeenCalledExactlyOnceWith({
      tourKey: "creator-dashboard",
      version: CURRENT_TOUR_VERSION,
      outcome: TOUR_OUTCOME.DISMISSED,
    });
  });

  describe("replay", () => {
    beforeEach(() => {
      searchParams = new URLSearchParams("tour=creator-dashboard");
      mockTourProgress({ tours: [buildProgress()] });
    });

    it("opens from the first step even though the tour was already seen, and cleans the URL without a router navigation", () => {
      render(<CreatorDashboardTour />);

      expect(openedTour()).toBeInTheDocument();
      expect(replaceState).toHaveBeenCalledExactlyOnceWith(null, "", "/overview");
    });

    it("does not open for a non-creator even if the link is followed", () => {
      mockAuth(false);

      render(<CreatorDashboardTour />);

      expect(openedTour()).not.toBeInTheDocument();
    });

    it("ignores a tour query value for a different tour", () => {
      searchParams = new URLSearchParams("tour=brand-dashboard");

      render(<CreatorDashboardTour />);

      expect(openedTour()).not.toBeInTheDocument();
      expect(replaceState).not.toHaveBeenCalled();
    });
  });
});
