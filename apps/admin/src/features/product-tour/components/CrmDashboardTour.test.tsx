import { renderWithRouter } from "@test/renderWithRouter";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Organization } from "@/features/crm/schemas";

import type { TourProgress } from "../api/toursSchemas";
import { TOUR_OUTCOME } from "../constants/tourOutcome";
import { useRecordTourOutcome } from "../hooks/useRecordTourOutcome";
import { useTourProgress } from "../hooks/useTourProgress";
import { CrmDashboardTour } from "./CrmDashboardTour";

const WELCOME_TITLE = "Welcome to the CRM";

vi.mock("../hooks/useTourProgress", () => ({ useTourProgress: vi.fn() }));
vi.mock("../hooks/useRecordTourOutcome", () => ({ useRecordTourOutcome: vi.fn() }));

const recordOutcome = vi.fn();

const buildOrganization = (overrides: Partial<Organization> = {}): Organization => ({
  id: "org-1",
  name: "Studio Nine",
  plan: "GROWTH",
  trialEndsAt: null,
  isPlatformOrg: false,
  linkedBrandId: "brand-1",
  superAdminMembershipId: "member-1",
  viewerIsSuperAdmin: true,
  viewerPermissionKeys: [],
  pendingOwnershipTransfer: null,
  advancedFeaturesEnabled: true,
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

const openedTour = () => screen.queryByRole("dialog", { name: WELCOME_TITLE });

const renderTour = (organization: Organization = buildOrganization(), initialEntry = "/crm") =>
  renderWithRouter(<CrmDashboardTour organization={organization} />, {
    path: "/crm",
    initialEntry,
  });

beforeEach(() => {
  vi.clearAllMocks();
  mockTourProgress({});
  vi.mocked(useRecordTourOutcome).mockReturnValue(buildIdleRecordMutation());
});

describe("CrmDashboardTour", () => {
  it("opens by itself for a super admin who has never seen the tour", async () => {
    renderTour();

    expect(await screen.findByRole("dialog", { name: WELCOME_TITLE })).toBeInTheDocument();
  });

  it("does not open for the platform organization", async () => {
    renderTour(buildOrganization({ isPlatformOrg: true }));

    await waitFor(() => expect(openedTour()).not.toBeInTheDocument());
  });

  it("only walks through the sections this viewer's role can actually see", async () => {
    renderTour(
      buildOrganization({
        viewerIsSuperAdmin: false,
        viewerPermissionKeys: ["pipeline:read"],
      }),
    );
    await screen.findByRole("dialog", { name: WELCOME_TITLE });

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByRole("dialog", { name: "Pipeline" })).toBeInTheDocument();
    expect(screen.getByText("3 of 4")).toBeInTheDocument();
  });

  it("hides the brand-scoped steps when the organization has no linked brand", async () => {
    renderTour(buildOrganization({ linkedBrandId: null }));
    await screen.findByRole("dialog", { name: WELCOME_TITLE });

    for (let step = 0; step < 9; step += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    }

    expect(screen.queryByRole("dialog", { name: "Partners" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Billing" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "You're all set" })).toBeInTheDocument();
  });

  it("records the outcome under the crm-dashboard tour key when skipped", async () => {
    renderTour();
    await screen.findByRole("dialog", { name: WELCOME_TITLE });

    fireEvent.click(screen.getByRole("button", { name: "Skip tour" }));

    expect(recordOutcome).toHaveBeenCalledExactlyOnceWith({
      tourKey: "crm-dashboard",
      version: 1,
      outcome: TOUR_OUTCOME.DISMISSED,
    });
  });

  it("replays from the first step via the ?tour= query value", async () => {
    mockTourProgress({
      tours: [
        {
          tourKey: "crm-dashboard",
          version: 1,
          outcome: TOUR_OUTCOME.COMPLETED,
          updatedAt: "2026-09-01T00:00:00.000Z",
        },
      ],
    });

    const { router } = renderTour(buildOrganization(), "/crm?tour=crm-dashboard");

    expect(await screen.findByRole("dialog", { name: WELCOME_TITLE })).toBeInTheDocument();
    expect(router.state.location.search).toEqual({});
  });
});
