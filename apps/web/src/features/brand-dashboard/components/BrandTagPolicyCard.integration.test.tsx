import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import type { BrandProfile } from "../api/brandDashboardSchemas";
import { BrandTagPolicyCard } from "./BrandTagPolicyCard";

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

const renderCard = (profile = buildProfile()) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
  return render(<BrandTagPolicyCard profile={profile} />, { wrapper });
};

const POLICY_LABEL = /When a creator tags one of your products/;

describe("BrandTagPolicyCard", () => {
  it("shows the current policy and keeps Save disabled until something changes", () => {
    renderCard();

    expect(screen.getByLabelText(POLICY_LABEL)).toHaveValue("TRUSTED_ONLY");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("persists the changed policy and toggle through PATCH /brands/me", async () => {
    let body: unknown;
    mswServer.use(
      http.patch("/api/brands/me", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({
          success: true,
          message: "ok",
          data: {
            brand: buildProfile({
              tagReviewPolicy: "APPROVAL_REQUIRED",
              autoApproveVerifiedBuyers: false,
            }).brand,
            membershipRole: "OWNER",
          },
        });
      }),
    );
    renderCard();

    await userEvent.selectOptions(screen.getByLabelText(POLICY_LABEL), "APPROVAL_REQUIRED");
    await userEvent.click(screen.getByLabelText("Auto-approve verified buyers"));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(body).toEqual({
        tagReviewPolicy: "APPROVAL_REQUIRED",
        autoApproveVerifiedBuyers: false,
      }),
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "Save" })).toBeDisabled());
  });
});
