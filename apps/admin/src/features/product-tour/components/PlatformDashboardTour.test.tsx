import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth/AuthContext";

import type { TourProgress } from "../api/toursSchemas";
import { TOUR_OUTCOME } from "../constants/tourOutcome";
import { useRecordTourOutcome } from "../hooks/useRecordTourOutcome";
import { useTourProgress } from "../hooks/useTourProgress";
import { PlatformDashboardTour } from "./PlatformDashboardTour";

const API_BASE = "http://localhost:3000/api";
const ok = (data: unknown) => HttpResponse.json({ success: true, data });
const WELCOME_TITLE = "Welcome to the platform panel";

vi.mock("../hooks/useTourProgress", () => ({ useTourProgress: vi.fn() }));
vi.mock("../hooks/useRecordTourOutcome", () => ({ useRecordTourOutcome: vi.fn() }));
vi.mock("@/features/auth/AuthContext", () => ({ useAuth: vi.fn() }));

const recordOutcome = vi.fn();

const buildOrganization = (overrides: Record<string, unknown> = {}) => ({
  id: "org-1",
  name: "Outfiqe Platform",
  plan: "growth",
  trialEndsAt: null,
  isPlatformOrg: true,
  linkedBrandId: null,
  superAdminMembershipId: "member-1",
  viewerIsSuperAdmin: true,
  viewerPermissionKeys: [],
  pendingOwnershipTransfer: null,
  advancedFeaturesEnabled: true,
  ...overrides,
});

const mockAuth = (user: {
  hasPlatformAccess: boolean;
  isCoFounder?: boolean;
  hiddenPlatformNavKeys?: string[];
}) => {
  vi.mocked(useAuth).mockReturnValue({
    state: {
      status: "signed-in",
      user: { isCoFounder: false, hiddenPlatformNavKeys: [], ...user },
    },
  } as ReturnType<typeof useAuth>);
};

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

const openedTour = () => screen.queryByRole("dialog", { name: WELCOME_TITLE });

const renderTour = (initialEntry = "/platform") =>
  renderWithRouter(<PlatformDashboardTour />, { path: "/platform", initialEntry });

beforeEach(() => {
  vi.clearAllMocks();
  mswServer.use(http.get(`${API_BASE}/crm/organization`, () => ok(buildOrganization())));
  mockAuth({ hasPlatformAccess: true });
  mockTourProgress({});
  vi.mocked(useRecordTourOutcome).mockReturnValue(buildIdleRecordMutation());
});

describe("PlatformDashboardTour", () => {
  it("opens by itself for platform staff who have never seen the tour", async () => {
    renderTour();

    expect(await screen.findByRole("dialog", { name: WELCOME_TITLE })).toBeInTheDocument();
  });

  it("does not open for someone without platform access", async () => {
    mockAuth({ hasPlatformAccess: false });

    renderTour();

    await waitFor(() => expect(openedTour()).not.toBeInTheDocument());
  });

  it("does not open while on a real tenant's own organization", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/organization`, () =>
        ok(buildOrganization({ isPlatformOrg: false })),
      ),
    );

    renderTour();

    await waitFor(() => expect(openedTour()).not.toBeInTheDocument());
  });

  it("walks through every group step ending on Finish", async () => {
    renderTour();
    await screen.findByRole("dialog", { name: WELCOME_TITLE });

    for (let step = 0; step < 9; step += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    }

    expect(screen.getByRole("dialog", { name: "You're all set" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finish" })).toBeInTheDocument();
  });

  it("records the outcome under the platform-dashboard tour key when skipped", async () => {
    renderTour();
    await screen.findByRole("dialog", { name: WELCOME_TITLE });

    fireEvent.click(screen.getByRole("button", { name: "Skip tour" }));

    expect(recordOutcome).toHaveBeenCalledExactlyOnceWith({
      tourKey: "platform-dashboard",
      version: 1,
      outcome: TOUR_OUTCOME.DISMISSED,
    });
  });

  it("skips a hidden group's step for a non-co-founder", async () => {
    mockAuth({ hasPlatformAccess: true, hiddenPlatformNavKeys: ["platform-features"] });

    renderTour();
    await screen.findByRole("dialog", { name: WELCOME_TITLE });
    for (let step = 0; step < 8; step += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    }

    expect(screen.queryByRole("dialog", { name: "Platform Settings" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "You're all set" })).toBeInTheDocument();
  });

  it("replays from the first step via the ?tour= query value", async () => {
    mockTourProgress({
      tours: [
        {
          tourKey: "platform-dashboard",
          version: 1,
          outcome: TOUR_OUTCOME.COMPLETED,
          updatedAt: "2026-09-01T00:00:00.000Z",
        },
      ],
    });

    const { router } = renderTour("/platform?tour=platform-dashboard");

    expect(await screen.findByRole("dialog", { name: WELCOME_TITLE })).toBeInTheDocument();
    expect(router.state.location.search).toEqual({});
  });
});
