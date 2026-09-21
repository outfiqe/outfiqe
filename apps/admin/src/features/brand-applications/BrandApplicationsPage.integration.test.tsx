import { toast, Toaster } from "@outfiqe/design-system";
import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { afterEach, describe, expect, it } from "vitest";

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

const renderPage = () =>
  renderWithRouter(
    <>
      <BrandApplicationsPage />
      <Toaster />
    </>,
    { path: "/platform/brand-applications" },
  );

afterEach(() => {
  toast.clear();
});

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

  it("reads the status filter from the URL on load", async () => {
    const requestedStatuses: (string | null)[] = [];
    mswServer.use(
      http.get(`${API_BASE}/brand-applications`, ({ request }) => {
        requestedStatuses.push(new URL(request.url).searchParams.get("status"));
        return HttpResponse.json({
          success: true,
          message: "ok",
          data: { applications: [], nextCursor: null },
        });
      }),
    );

    renderWithRouter(<BrandApplicationsPage />, {
      path: "/platform/brand-applications",
      initialEntry: "/platform/brand-applications?status=APPROVED",
    });

    await waitFor(() => expect(requestedStatuses).toContain("APPROVED"));
    expect(await screen.findByRole("button", { name: "Approved" })).toHaveClass("bg-foreground");
  });

  it("puts the chosen status in the URL and refetches", async () => {
    const requestedStatuses: (string | null)[] = [];
    mswServer.use(
      http.get(`${API_BASE}/brand-applications`, ({ request }) => {
        requestedStatuses.push(new URL(request.url).searchParams.get("status"));
        return HttpResponse.json({
          success: true,
          message: "ok",
          data: { applications: [], nextCursor: null },
        });
      }),
    );

    const { router } = renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Rejected" }));

    await waitFor(() => expect(router.state.location.search).toEqual({ status: "REJECTED" }));
    await waitFor(() => expect(requestedStatuses).toContain("REJECTED"));
  });

  it("approves a pending application", async () => {
    let approveCalled = false;
    mswServer.use(
      http.get(`${API_BASE}/brand-applications`, () =>
        HttpResponse.json({
          success: true,
          message: "ok",
          data: { applications: [pendingApplication], nextCursor: null },
        }),
      ),
      http.post(`${API_BASE}/brand-applications/app-1/approve`, () => {
        approveCalled = true;
        return HttpResponse.json({ success: true, message: "ok", data: null });
      }),
    );

    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Approve" }));

    await waitFor(() => expect(approveCalled).toBe(true));
    expect(await screen.findByText("Application approved.")).toBeInTheDocument();
  });

  it("shows a loading spinner on the Approve button while the approval is under way", async () => {
    mswServer.use(
      http.get(`${API_BASE}/brand-applications`, () =>
        HttpResponse.json({
          success: true,
          message: "ok",
          data: { applications: [pendingApplication], nextCursor: null },
        }),
      ),
      http.post(`${API_BASE}/brand-applications/app-1/approve`, async () => {
        await delay(150);
        return HttpResponse.json({ success: true, message: "ok", data: null });
      }),
    );

    renderPage();

    const approveButton = await screen.findByRole("button", { name: "Approve" });
    await userEvent.click(approveButton);

    await waitFor(() => expect(approveButton).toHaveAttribute("aria-busy", "true"));
    expect(approveButton).toBeDisabled();
    await waitFor(() => expect(screen.queryByText("Application approved.")).toBeInTheDocument());
  });

  it("does not show a success toast when the approval fails", async () => {
    mswServer.use(
      http.get(`${API_BASE}/brand-applications`, () =>
        HttpResponse.json({
          success: true,
          message: "ok",
          data: { applications: [pendingApplication], nextCursor: null },
        }),
      ),
      http.post(`${API_BASE}/brand-applications/app-1/approve`, () =>
        HttpResponse.json({ success: false, message: "Nope." }, { status: 409 }),
      ),
    );

    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Approve" }));

    expect(await screen.findByText("Nope.")).toBeInTheDocument();
    expect(screen.queryByText("Application approved.")).not.toBeInTheDocument();
  });

  it("rejects an application with a reason through the prompt modal", async () => {
    let rejectBody: unknown;
    mswServer.use(
      http.get(`${API_BASE}/brand-applications`, () =>
        HttpResponse.json({
          success: true,
          message: "ok",
          data: { applications: [pendingApplication], nextCursor: null },
        }),
      ),
      http.post(`${API_BASE}/brand-applications/app-1/reject`, async ({ request }) => {
        rejectBody = await request.json();
        return HttpResponse.json({ success: true, message: "ok", data: null });
      }),
    );

    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Reject" }));
    const dialog = await screen.findByRole("dialog", { name: "Reject brand application" });
    await userEvent.type(
      within(dialog).getByLabelText("Reason for rejecting (optional)"),
      "Doesn't make its own pieces.",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Reject" }));

    await waitFor(() => expect(rejectBody).toEqual({ reason: "Doesn't make its own pieces." }));
    expect(await screen.findByText("Application rejected.")).toBeInTheDocument();
  });

  it("shows an error when rejecting an application fails", async () => {
    mswServer.use(
      http.get(`${API_BASE}/brand-applications`, () =>
        HttpResponse.json({
          success: true,
          message: "ok",
          data: { applications: [pendingApplication], nextCursor: null },
        }),
      ),
      http.post(`${API_BASE}/brand-applications/app-1/reject`, () =>
        HttpResponse.json({ success: false, message: "Nope." }, { status: 500 }),
      ),
    );

    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Reject" }));
    const dialog = await screen.findByRole("dialog", { name: "Reject brand application" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Reject" }));

    expect(await screen.findByText("Nope.")).toBeInTheDocument();
  });

  it("closes the reject modal without submitting when cancelled", async () => {
    mswServer.use(
      http.get(`${API_BASE}/brand-applications`, () =>
        HttpResponse.json({
          success: true,
          message: "ok",
          data: { applications: [pendingApplication], nextCursor: null },
        }),
      ),
    );

    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Reject" }));
    const dialog = await screen.findByRole("dialog", { name: "Reject brand application" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Reject brand application" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("loads more applications when there is a next page", async () => {
    mswServer.use(
      http.get(`${API_BASE}/brand-applications`, ({ request }) => {
        const cursor = new URL(request.url).searchParams.get("cursor");
        return HttpResponse.json({
          success: true,
          message: "ok",
          data: {
            applications: cursor
              ? [{ ...pendingApplication, id: "app-2", brandName: "Second Brand" }]
              : [pendingApplication],
            nextCursor: cursor ? null : "cursor-1",
          },
        });
      }),
    );

    renderPage();

    await screen.findByText("Instyle Nepal");
    await userEvent.click(await screen.findByRole("button", { name: "Load more" }));

    expect(await screen.findByText("Second Brand")).toBeInTheDocument();
  });

  it("shows an error when loading applications fails", async () => {
    mswServer.use(
      http.get(`${API_BASE}/brand-applications`, () =>
        HttpResponse.json({ success: false, message: "Server error." }, { status: 500 }),
      ),
    );

    renderPage();

    expect(await screen.findByText("Couldn't load applications.")).toBeInTheDocument();
  });

  it("falls back to a placeholder when an applicant has no email on file", async () => {
    mswServer.use(
      http.get(`${API_BASE}/brand-applications`, () =>
        HttpResponse.json({
          success: true,
          message: "ok",
          data: { applications: [{ ...pendingApplication, email: "" }], nextCursor: null },
        }),
      ),
    );

    renderPage();

    expect(await screen.findByText(/No email on file/)).toBeInTheDocument();
  });

  it("shows the empty state when there are no applications in the tab", async () => {
    mswServer.use(
      http.get(`${API_BASE}/brand-applications`, () =>
        HttpResponse.json({
          success: true,
          message: "ok",
          data: { applications: [], nextCursor: null },
        }),
      ),
    );

    renderPage();

    expect(await screen.findByText("Nothing here right now.")).toBeInTheDocument();
  });
});
