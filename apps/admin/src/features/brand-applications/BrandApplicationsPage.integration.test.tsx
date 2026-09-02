import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { BrandApplicationsPage } from "@/features/brand-applications/BrandApplicationsPage";

const API_BASE = "http://localhost:3000/api";

const pendingApplication = {
  id: "app-1",
  brandName: "Instyle Nepal",
  contactName: "Jordan Lee",
  email: "taken@outfiqe.test",
  phone: "9800000000",
  instagram: "@instyle",
  makesOwnPieces: "MAKES",
  status: "PENDING",
  reviewedAt: null,
  reviewedById: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(<BrandApplicationsPage />, { wrapper });
};

describe("BrandApplicationsPage", () => {
  it("shows the server's reason when approval is blocked for a registered email", async () => {
    const blockedMessage =
      "This email already belongs to an Outfiqe account, so brand setup can't be completed. " +
      "Reject this application and ask the applicant to reapply with an email that isn't registered.";

    mswServer.use(
      http.get(`${API_BASE}/brand-applications`, () =>
        HttpResponse.json({
          success: true,
          message: "ok",
          data: { applications: [pendingApplication], nextCursor: null },
        }),
      ),
      http.post(`${API_BASE}/brand-applications/app-1/approve`, () =>
        HttpResponse.json(
          { success: false, message: blockedMessage, code: "EMAIL_ALREADY_REGISTERED" },
          { status: 409 },
        ),
      ),
    );

    renderPage();

    const approveButton = await screen.findByRole("button", { name: "Approve" });
    await userEvent.click(approveButton);

    expect(await screen.findByText(blockedMessage)).toBeInTheDocument();
  });

  it("keeps the approve action usable after a failed attempt", async () => {
    mswServer.use(
      http.get(`${API_BASE}/brand-applications`, () =>
        HttpResponse.json({
          success: true,
          message: "ok",
          data: { applications: [pendingApplication], nextCursor: null },
        }),
      ),
      http.post(`${API_BASE}/brand-applications/app-1/approve`, () =>
        HttpResponse.json(
          { success: false, message: "Nope.", code: "EMAIL_ALREADY_REGISTERED" },
          { status: 409 },
        ),
      ),
    );

    renderPage();

    const approveButton = await screen.findByRole("button", { name: "Approve" });
    await userEvent.click(approveButton);

    await waitFor(() => expect(approveButton).toBeEnabled());
  });
});
