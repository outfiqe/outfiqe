import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth/context/AuthContext";
import { AuthStatus, CreatorStatus, UserRole, type UserSession } from "@/features/auth/types";

import type { BrandProfile } from "../api/brandDashboardSchemas";
import { BrandProfileView } from "./BrandProfileView";

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

const refresh = vi.fn();

beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

const buildUserSession = (): UserSession => ({
  id: "owner-1",
  name: "Brand Owner",
  email: "owner@studionine.test",
  avatarUrl: null,
  role: UserRole.BRAND_OWNER,
  isCreator: false,
  creatorStatus: CreatorStatus.NONE,
});

const mockAuth = (updateUser = vi.fn()) => {
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated: true,
    isAuthResolved: true,
    isBrandOwner: true,
    isAdmin: false,
    isCreator: false,
    isShopper: false,
    hasCrmAccess: false,
    state: {
      user: buildUserSession(),
      accessToken: "test-access-token",
      status: AuthStatus.AUTHENTICATED,
    },
    dispatch: vi.fn(),
    logout: vi.fn(),
    updateUser,
  });
  return updateUser;
};

beforeEach(() => {
  mockAuth();
  vi.mocked(useRouter).mockReturnValue({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh,
    prefetch: vi.fn(),
    bfcacheId: "test-bfcache-id",
  });
  refresh.mockClear();
});

const buildProfile = (overrides: Partial<BrandProfile["brand"]> = {}): BrandProfile => ({
  brand: {
    id: "brand-1",
    name: "Studio Nine",
    contactName: "Mina",
    email: "mina@studionine.test",
    phone: "9800000000",
    instagram: "@studionine",
    avatarUrl: null,
    bannerUrl: null,
    madeInNepal: true,
    tagReviewPolicy: "TRUSTED_ONLY",
    autoApproveVerifiedBuyers: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  },
  membershipRole: "OWNER",
});

const renderProfile = (profile = buildProfile()) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
  return render(<BrandProfileView profile={profile} />, { wrapper });
};

describe("BrandProfileView", () => {
  it("shows the brand's current contact details", () => {
    renderProfile();

    expect(screen.getByText("Mina")).toBeInTheDocument();
    expect(screen.getByText("9800000000")).toBeInTheDocument();
    expect(screen.getByText("@studionine")).toBeInTheDocument();
  });

  it("associates every edit field with its label", async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByRole("button", { name: "Edit profile" }));

    expect(screen.getByLabelText("Contact name")).toHaveValue("Mina");
    expect(screen.getByLabelText("Phone")).toHaveValue("9800000000");
    expect(screen.getByLabelText("Instagram")).toHaveValue("@studionine");
  });

  it("reflects a saved edit immediately without a manual reload, and refreshes the router", async () => {
    let body: unknown;
    mswServer.use(
      http.patch("/api/brands/me", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({
          success: true,
          message: "ok",
          data: buildProfile({ contactName: "New Contact" }),
        });
      }),
    );
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    const dialog = screen.getByRole("dialog");
    const contactNameInput = within(dialog).getByLabelText("Contact name");
    await user.clear(contactNameInput);
    await user.type(contactNameInput, "New Contact");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(body).toMatchObject({ contactName: "New Contact", phone: "9800000000" }),
    );
    expect(await screen.findByText("New Contact")).toBeInTheDocument();
    expect(screen.queryByText("Mina")).not.toBeInTheDocument();
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  });

  it("shows an error toast and keeps the modal open when the save fails", async () => {
    mswServer.use(
      http.patch("/api/brands/me", () =>
        HttpResponse.json({ success: false, message: "Something went wrong." }, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Something went wrong.")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});
