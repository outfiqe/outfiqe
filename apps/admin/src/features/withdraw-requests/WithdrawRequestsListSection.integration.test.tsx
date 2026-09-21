import { Toaster } from "@outfiqe/design-system";
import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { WithdrawRequestsListSection } from "./WithdrawRequestsListSection";

const API_BASE = "http://localhost:3000/api";

const withdrawRequest = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "request-1",
  ownerType: "CREATOR" as const,
  ownerName: "Asha Rai",
  bankAccountLast4: "1234",
  amount: 5_000,
  status: "PENDING" as const,
  rejectionReason: null,
  referenceNote: null,
  requiresSecondSignOff: false,
  firstApprovedById: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  reviewedAt: null,
  paidAt: null,
  ...overrides,
});

const okJson = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const renderSection = () =>
  renderWithRouter(
    <>
      <WithdrawRequestsListSection />
      <Toaster />
    </>,
    { path: "/withdraw-requests" },
  );

describe("WithdrawRequestsListSection", () => {
  it("shows the empty state when there are no requests in the tab", async () => {
    mswServer.use(
      http.get(`${API_BASE}/withdraw/admin/requests`, () =>
        okJson({ items: [], nextCursor: null }),
      ),
    );

    renderSection();

    expect(await screen.findByText("Nothing here right now.")).toBeInTheDocument();
  });

  it("shows an error when loading requests fails", async () => {
    mswServer.use(
      http.get(`${API_BASE}/withdraw/admin/requests`, () =>
        HttpResponse.json({ success: false, message: "Server error." }, { status: 500 }),
      ),
    );

    renderSection();

    expect(await screen.findByText("Couldn't load requests.")).toBeInTheDocument();
  });

  it("lists a withdraw request for the current tab", async () => {
    mswServer.use(
      http.get(`${API_BASE}/withdraw/admin/requests`, () =>
        okJson({ items: [withdrawRequest()], nextCursor: null }),
      ),
    );

    renderSection();

    expect(await screen.findByText(/Asha Rai/)).toBeInTheDocument();
  });

  it("reads the status filter from the URL on load", async () => {
    const requestedStatuses: (string | null)[] = [];
    mswServer.use(
      http.get(`${API_BASE}/withdraw/admin/requests`, ({ request }) => {
        requestedStatuses.push(new URL(request.url).searchParams.get("status"));
        return okJson({ items: [], nextCursor: null });
      }),
    );

    renderWithRouter(<WithdrawRequestsListSection />, {
      path: "/withdraw-requests",
      initialEntry: "/withdraw-requests?status=PAID",
    });

    await waitFor(() => expect(requestedStatuses).toContain("PAID"));
  });

  it("puts the chosen status in the URL and refetches", async () => {
    const requestedStatuses: (string | null)[] = [];
    mswServer.use(
      http.get(`${API_BASE}/withdraw/admin/requests`, ({ request }) => {
        requestedStatuses.push(new URL(request.url).searchParams.get("status"));
        return okJson({ items: [], nextCursor: null });
      }),
    );

    const { router } = renderSection();

    await userEvent.click(await screen.findByRole("button", { name: "REJECTED" }));

    await waitFor(() => expect(router.state.location.search).toEqual({ status: "REJECTED" }));
    await waitFor(() => expect(requestedStatuses).toContain("REJECTED"));
  });

  it("approves a pending request directly when no cross-check is required", async () => {
    let approveBody: unknown;
    mswServer.use(
      http.get(`${API_BASE}/withdraw/admin/requests`, () =>
        okJson({ items: [withdrawRequest()], nextCursor: null }),
      ),
      http.patch(`${API_BASE}/withdraw/admin/requests/request-1/approve`, async ({ request }) => {
        approveBody = await request.json();
        return okJson(null);
      }),
    );

    renderSection();

    await userEvent.click(await screen.findByRole("button", { name: "Approve" }));

    await waitFor(() => expect(approveBody).toEqual({}));
    expect(await screen.findByText("Withdrawal approved.")).toBeInTheDocument();
  });

  it("prompts for an identity cross-check when the server requires it, then approves", async () => {
    let approveBody: unknown;
    let approveCallCount = 0;
    mswServer.use(
      http.get(`${API_BASE}/withdraw/admin/requests`, () =>
        okJson({ items: [withdrawRequest()], nextCursor: null }),
      ),
      http.patch(`${API_BASE}/withdraw/admin/requests/request-1/approve`, async ({ request }) => {
        approveCallCount += 1;
        approveBody = await request.json();
        if (approveCallCount === 1) {
          return HttpResponse.json(
            {
              success: false,
              message: "Confirm the identity cross-check first.",
              code: "IDENTITY_CROSS_CHECK_REQUIRED",
            },
            { status: 409 },
          );
        }
        return okJson(null);
      }),
    );

    renderSection();

    await userEvent.click(await screen.findByRole("button", { name: "Approve" }));

    const dialog = await screen.findByRole("dialog", { name: "Confirm identity cross-check" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Confirm and approve" }));

    await waitFor(() => expect(approveCallCount).toBe(2));
    expect(approveBody).toEqual({ identityCrossCheckConfirmed: true });
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Confirm identity cross-check" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("shows an error toast for a generic approval failure", async () => {
    mswServer.use(
      http.get(`${API_BASE}/withdraw/admin/requests`, () =>
        okJson({ items: [withdrawRequest()], nextCursor: null }),
      ),
      http.patch(`${API_BASE}/withdraw/admin/requests/request-1/approve`, () =>
        HttpResponse.json(
          { success: false, message: "Only platform staff can approve requests." },
          { status: 403 },
        ),
      ),
    );

    renderSection();

    await userEvent.click(await screen.findByRole("button", { name: "Approve" }));

    expect(
      await screen.findByText("Only platform staff can approve requests."),
    ).toBeInTheDocument();
  });

  it("closes the cross-check modal without approving when cancelled", async () => {
    mswServer.use(
      http.get(`${API_BASE}/withdraw/admin/requests`, () =>
        okJson({ items: [withdrawRequest()], nextCursor: null }),
      ),
      http.patch(`${API_BASE}/withdraw/admin/requests/request-1/approve`, () =>
        HttpResponse.json(
          {
            success: false,
            message: "Confirm the identity cross-check first.",
            code: "IDENTITY_CROSS_CHECK_REQUIRED",
          },
          { status: 409 },
        ),
      ),
    );

    renderSection();

    await userEvent.click(await screen.findByRole("button", { name: "Approve" }));
    const dialog = await screen.findByRole("dialog", { name: "Confirm identity cross-check" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Confirm identity cross-check" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("shows an error toast when rejecting a request fails", async () => {
    mswServer.use(
      http.get(`${API_BASE}/withdraw/admin/requests`, () =>
        okJson({ items: [withdrawRequest()], nextCursor: null }),
      ),
      http.patch(`${API_BASE}/withdraw/admin/requests/request-1/reject`, () =>
        HttpResponse.json(
          { success: false, message: "Only platform staff can reject requests." },
          { status: 403 },
        ),
      ),
    );

    renderSection();

    await userEvent.click(await screen.findByRole("button", { name: "Reject" }));
    const dialog = await screen.findByRole("dialog", { name: "Reject withdrawal request" });
    await userEvent.type(
      within(dialog).getByLabelText("Reason for rejecting this request"),
      "Bank details don't match.",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Reject" }));

    expect(await screen.findByText("Only platform staff can reject requests.")).toBeInTheDocument();
  });

  it("closes the reject modal without submitting when cancelled", async () => {
    mswServer.use(
      http.get(`${API_BASE}/withdraw/admin/requests`, () =>
        okJson({ items: [withdrawRequest()], nextCursor: null }),
      ),
    );

    renderSection();

    await userEvent.click(await screen.findByRole("button", { name: "Reject" }));
    const dialog = await screen.findByRole("dialog", { name: "Reject withdrawal request" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Reject withdrawal request" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("shows an error toast when marking a request paid fails", async () => {
    mswServer.use(
      http.get(`${API_BASE}/withdraw/admin/requests`, () =>
        okJson({ items: [withdrawRequest({ status: "APPROVED" })], nextCursor: null }),
      ),
      http.patch(`${API_BASE}/withdraw/admin/requests/request-1/mark-paid`, () =>
        HttpResponse.json(
          { success: false, message: "Only platform staff can mark requests paid." },
          { status: 403 },
        ),
      ),
    );

    renderSection();

    await userEvent.click(await screen.findByRole("button", { name: "Mark paid" }));
    const dialog = await screen.findByRole("dialog", { name: "Mark withdrawal request paid" });
    await userEvent.type(
      within(dialog).getByLabelText("Payment reference (transaction id, note)"),
      "TXN-882",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Mark paid" }));

    expect(
      await screen.findByText("Only platform staff can mark requests paid."),
    ).toBeInTheDocument();
  });

  it("closes the mark-paid modal without submitting when cancelled", async () => {
    mswServer.use(
      http.get(`${API_BASE}/withdraw/admin/requests`, () =>
        okJson({ items: [withdrawRequest({ status: "APPROVED" })], nextCursor: null }),
      ),
    );

    renderSection();

    await userEvent.click(await screen.findByRole("button", { name: "Mark paid" }));
    const dialog = await screen.findByRole("dialog", { name: "Mark withdrawal request paid" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Mark withdrawal request paid" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("loads more requests when there is a next page", async () => {
    mswServer.use(
      http.get(`${API_BASE}/withdraw/admin/requests`, ({ request }) => {
        const cursor = new URL(request.url).searchParams.get("cursor");
        return okJson({
          items: cursor
            ? [withdrawRequest({ id: "request-2", ownerName: "Second Owner" })]
            : [withdrawRequest()],
          nextCursor: cursor ? null : "cursor-1",
        });
      }),
    );

    renderSection();

    await screen.findByText(/Asha Rai/);
    await userEvent.click(await screen.findByRole("button", { name: "Load more" }));

    expect(await screen.findByText(/Second Owner/)).toBeInTheDocument();
  });

  it("rejects a request with a reason through the prompt modal", async () => {
    let rejectBody: unknown;
    mswServer.use(
      http.get(`${API_BASE}/withdraw/admin/requests`, () =>
        okJson({ items: [withdrawRequest()], nextCursor: null }),
      ),
      http.patch(`${API_BASE}/withdraw/admin/requests/request-1/reject`, async ({ request }) => {
        rejectBody = await request.json();
        return okJson(null);
      }),
    );

    renderSection();

    await userEvent.click(await screen.findByRole("button", { name: "Reject" }));
    const dialog = await screen.findByRole("dialog", { name: "Reject withdrawal request" });
    await userEvent.type(
      within(dialog).getByLabelText("Reason for rejecting this request"),
      "Bank details don't match.",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Reject" }));

    await waitFor(() => expect(rejectBody).toEqual({ reason: "Bank details don't match." }));
  });

  it("marks an approved request paid with a reference note", async () => {
    let markPaidBody: unknown;
    mswServer.use(
      http.get(`${API_BASE}/withdraw/admin/requests`, () =>
        okJson({ items: [withdrawRequest({ status: "APPROVED" })], nextCursor: null }),
      ),
      http.patch(`${API_BASE}/withdraw/admin/requests/request-1/mark-paid`, async ({ request }) => {
        markPaidBody = await request.json();
        return okJson(null);
      }),
    );

    renderSection();

    await userEvent.click(await screen.findByRole("button", { name: "Mark paid" }));
    const dialog = await screen.findByRole("dialog", { name: "Mark withdrawal request paid" });
    await userEvent.type(
      within(dialog).getByLabelText("Payment reference (transaction id, note)"),
      "TXN-882",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Mark paid" }));

    await waitFor(() => expect(markPaidBody).toEqual({ referenceNote: "TXN-882" }));
  });

  it("shows the second-sign-off note for an under-review request awaiting a different admin", async () => {
    mswServer.use(
      http.get(`${API_BASE}/withdraw/admin/requests`, () =>
        okJson({
          items: [
            withdrawRequest({
              status: "UNDER_REVIEW",
              requiresSecondSignOff: true,
              firstApprovedById: "admin-1",
            }),
          ],
          nextCursor: null,
        }),
      ),
    );

    renderSection();

    expect(
      await screen.findByText("Signed off once — needs a different admin to approve."),
    ).toBeInTheDocument();
  });

  it("shows the above-limit note for an under-review request with no first approval yet", async () => {
    mswServer.use(
      http.get(`${API_BASE}/withdraw/admin/requests`, () =>
        okJson({
          items: [
            withdrawRequest({
              status: "UNDER_REVIEW",
              requiresSecondSignOff: true,
              firstApprovedById: null,
            }),
          ],
          nextCursor: null,
        }),
      ),
    );

    renderSection();

    expect(
      await screen.findByText("Above the standard limit — needs sign-off from two admins."),
    ).toBeInTheDocument();
  });

  it("shows the rejection reason on a rejected request", async () => {
    mswServer.use(
      http.get(`${API_BASE}/withdraw/admin/requests`, () =>
        okJson({
          items: [withdrawRequest({ status: "REJECTED", rejectionReason: "Fraud suspected." })],
          nextCursor: null,
        }),
      ),
    );

    renderSection();

    expect(await screen.findByText("Reason: Fraud suspected.")).toBeInTheDocument();
  });

  it("shows the reference note on a paid request", async () => {
    mswServer.use(
      http.get(`${API_BASE}/withdraw/admin/requests`, () =>
        okJson({
          items: [withdrawRequest({ status: "PAID", referenceNote: "TXN-119" })],
          nextCursor: null,
        }),
      ),
    );

    renderSection();

    expect(await screen.findByText("Reference: TXN-119")).toBeInTheDocument();
  });
});
