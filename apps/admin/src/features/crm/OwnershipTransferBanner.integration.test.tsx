import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { OwnershipTransferBanner } from "./OwnershipTransferBanner";
import type { Organization } from "./schemas";

const API_BASE = "http://localhost:3000/api";
const CURRENT_USER_ID = "current-user-id";

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({
    state: { status: "signed-in", user: { id: CURRENT_USER_ID } },
  }),
}));

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
};

const pendingTransferToCurrentUser = {
  id: "transfer-1",
  toMembershipId: "membership-2",
  toUserId: CURRENT_USER_ID,
  toUserName: "Current User",
  fromUserName: "Bipin Karki",
  removeSenderMembershipOnAccept: false,
  expiresAt: "2026-09-08T00:00:00.000Z",
};

const baseOrganization: Organization = {
  id: "org-1",
  name: "Meridian Apparel Co.",
  plan: "trial",
  trialEndsAt: null,
  superAdminMembershipId: "membership-1",
  viewerIsSuperAdmin: false,
  viewerPermissionKeys: [],
  pendingOwnershipTransfer: pendingTransferToCurrentUser,
  advancedFeaturesEnabled: true,
};

describe("OwnershipTransferBanner", () => {
  it("accepts the transfer when the recipient clicks Accept", async () => {
    let acceptedRequestId: string | undefined;
    mswServer.use(
      http.post(`${API_BASE}/crm/ownership-transfer/:requestId/accept`, ({ params }) => {
        acceptedRequestId = params.requestId as string;
        return HttpResponse.json({ success: true, data: null });
      }),
    );

    render(<OwnershipTransferBanner organization={baseOrganization} />, { wrapper });

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Accept" }));

    await waitFor(() => expect(acceptedRequestId).toBe("transfer-1"));
  });

  it("declines the transfer when the recipient clicks Decline", async () => {
    let declinedRequestId: string | undefined;
    mswServer.use(
      http.post(`${API_BASE}/crm/ownership-transfer/:requestId/decline`, ({ params }) => {
        declinedRequestId = params.requestId as string;
        return HttpResponse.json({ success: true, data: null });
      }),
    );

    render(<OwnershipTransferBanner organization={baseOrganization} />, { wrapper });

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Decline" }));

    await waitFor(() => expect(declinedRequestId).toBe("transfer-1"));
  });

  it("shows an error toast when accepting fails", async () => {
    mswServer.use(
      http.post(
        `${API_BASE}/crm/ownership-transfer/:requestId/accept`,
        () =>
          new HttpResponse(
            JSON.stringify({
              success: false,
              message: "This ownership transfer is no longer available.",
              code: "TRANSFER_INVALID",
            }),
            { status: 409 },
          ),
      ),
    );

    render(<OwnershipTransferBanner organization={baseOrganization} />, { wrapper });

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Accept" }));

    expect(
      await screen.findByText("This ownership transfer is no longer available."),
    ).toBeInTheDocument();
  });

  it("revokes the transfer when the SUPERADMIN who sent it clicks Cancel", async () => {
    let revokedRequestId: string | undefined;
    mswServer.use(
      http.delete(`${API_BASE}/crm/ownership-transfer/:requestId`, ({ params }) => {
        revokedRequestId = params.requestId as string;
        return HttpResponse.json({ success: true, data: null });
      }),
    );

    const organizationForSender: Organization = {
      ...baseOrganization,
      viewerIsSuperAdmin: true,
      pendingOwnershipTransfer: { ...pendingTransferToCurrentUser, toUserId: "someone-else" },
    };

    render(<OwnershipTransferBanner organization={organizationForSender} />, { wrapper });

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(revokedRequestId).toBe("transfer-1"));
  });

  it("renders nothing when there is no pending transfer", () => {
    render(
      <OwnershipTransferBanner
        organization={{ ...baseOrganization, pendingOwnershipTransfer: null }}
      />,
      { wrapper },
    );

    expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });
});
