import { Toaster } from "@outfiqe/design-system";
import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { CommissionsListSection } from "./CommissionsListSection";

const API_BASE = "http://localhost:3000/api";

const commission = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "commission-1",
  creatorName: "Asha Rai",
  productName: "Linen Shirt",
  brandName: "Studio Nine",
  source: "TAG_CLICK" as const,
  status: "PENDING" as const,
  amount: 500,
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const okJson = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const renderSection = () =>
  renderWithRouter(
    <>
      <CommissionsListSection />
      <Toaster />
    </>,
    { path: "/commissions" },
  );

describe("CommissionsListSection", () => {
  it("shows the empty state when there are no commissions in the tab", async () => {
    mswServer.use(
      http.get(`${API_BASE}/commissions`, () => okJson({ items: [], nextCursor: null })),
    );

    renderSection();

    expect(await screen.findByText("Nothing here right now.")).toBeInTheDocument();
  });

  it("shows an error when loading commissions fails", async () => {
    mswServer.use(
      http.get(`${API_BASE}/commissions`, () =>
        HttpResponse.json({ success: false, message: "Server error." }, { status: 500 }),
      ),
    );

    renderSection();

    expect(await screen.findByText("Couldn't load commissions.")).toBeInTheDocument();
  });

  it("lists a commission for the current tab", async () => {
    mswServer.use(
      http.get(`${API_BASE}/commissions`, () =>
        okJson({ items: [commission()], nextCursor: null }),
      ),
    );

    renderSection();

    expect(await screen.findByText("Asha Rai")).toBeInTheDocument();
  });

  it("reads the status filter from the URL on load", async () => {
    const requestedStatuses: (string | null)[] = [];
    mswServer.use(
      http.get(`${API_BASE}/commissions`, ({ request }) => {
        requestedStatuses.push(new URL(request.url).searchParams.get("status"));
        return okJson({ items: [], nextCursor: null });
      }),
    );

    renderWithRouter(<CommissionsListSection />, {
      path: "/commissions",
      initialEntry: "/commissions?status=PAID",
    });

    await waitFor(() => expect(requestedStatuses).toContain("PAID"));
  });

  it("puts the chosen status in the URL and refetches", async () => {
    const requestedStatuses: (string | null)[] = [];
    mswServer.use(
      http.get(`${API_BASE}/commissions`, ({ request }) => {
        requestedStatuses.push(new URL(request.url).searchParams.get("status"));
        return okJson({ items: [], nextCursor: null });
      }),
    );

    const { router } = renderSection();

    await userEvent.click(await screen.findByRole("button", { name: "VOIDED" }));

    await waitFor(() => expect(router.state.location.search).toEqual({ status: "VOIDED" }));
    await waitFor(() => expect(requestedStatuses).toContain("VOIDED"));
  });

  it("approves a pending commission", async () => {
    let approveCalled = false;
    mswServer.use(
      http.get(`${API_BASE}/commissions`, () =>
        okJson({ items: [commission()], nextCursor: null }),
      ),
      http.post(`${API_BASE}/commissions/commission-1/approve`, () => {
        approveCalled = true;
        return okJson(null);
      }),
    );

    renderSection();

    await userEvent.click(await screen.findByRole("button", { name: "Approve" }));

    await waitFor(() => expect(approveCalled).toBe(true));
    expect(await screen.findByText("Commission approved.")).toBeInTheDocument();
  });

  it("shows an error toast when approving a commission fails", async () => {
    mswServer.use(
      http.get(`${API_BASE}/commissions`, () =>
        okJson({ items: [commission()], nextCursor: null }),
      ),
      http.post(`${API_BASE}/commissions/commission-1/approve`, () =>
        HttpResponse.json(
          { success: false, message: "Only platform staff can approve commissions." },
          { status: 403 },
        ),
      ),
    );

    renderSection();

    await userEvent.click(await screen.findByRole("button", { name: "Approve" }));

    expect(
      await screen.findByText("Only platform staff can approve commissions."),
    ).toBeInTheDocument();
  });

  it("marks an available commission paid", async () => {
    let markPaidCalled = false;
    mswServer.use(
      http.get(`${API_BASE}/commissions`, () =>
        okJson({ items: [commission({ status: "AVAILABLE" })], nextCursor: null }),
      ),
      http.post(`${API_BASE}/commissions/commission-1/mark-paid`, () => {
        markPaidCalled = true;
        return okJson(null);
      }),
    );

    renderSection();

    await userEvent.click(await screen.findByRole("button", { name: "Mark paid" }));

    await waitFor(() => expect(markPaidCalled).toBe(true));
  });

  it("voids a commission with a reason through the prompt modal", async () => {
    let voidBody: unknown;
    mswServer.use(
      http.get(`${API_BASE}/commissions`, () =>
        okJson({ items: [commission()], nextCursor: null }),
      ),
      http.post(`${API_BASE}/commissions/commission-1/void`, async ({ request }) => {
        voidBody = await request.json();
        return okJson(null);
      }),
    );

    renderSection();

    await userEvent.click(await screen.findByRole("button", { name: "Void" }));
    const dialog = await screen.findByRole("dialog", { name: "Void commission" });
    await userEvent.type(
      within(dialog).getByLabelText("Reason for voiding this commission"),
      "Duplicate attribution.",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Void" }));

    await waitFor(() => expect(voidBody).toEqual({ reason: "Duplicate attribution." }));
  });

  it("shows an error toast when marking a commission paid fails", async () => {
    mswServer.use(
      http.get(`${API_BASE}/commissions`, () =>
        okJson({ items: [commission({ status: "AVAILABLE" })], nextCursor: null }),
      ),
      http.post(`${API_BASE}/commissions/commission-1/mark-paid`, () =>
        HttpResponse.json(
          { success: false, message: "Only platform staff can mark commissions paid." },
          { status: 403 },
        ),
      ),
    );

    renderSection();

    await userEvent.click(await screen.findByRole("button", { name: "Mark paid" }));

    expect(
      await screen.findByText("Only platform staff can mark commissions paid."),
    ).toBeInTheDocument();
  });

  it("shows an error toast when voiding a commission fails", async () => {
    mswServer.use(
      http.get(`${API_BASE}/commissions`, () =>
        okJson({ items: [commission()], nextCursor: null }),
      ),
      http.post(`${API_BASE}/commissions/commission-1/void`, () =>
        HttpResponse.json(
          { success: false, message: "Only platform staff can void commissions." },
          { status: 403 },
        ),
      ),
    );

    renderSection();

    await userEvent.click(await screen.findByRole("button", { name: "Void" }));
    const dialog = await screen.findByRole("dialog", { name: "Void commission" });
    await userEvent.type(
      within(dialog).getByLabelText("Reason for voiding this commission"),
      "Duplicate attribution.",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Void" }));

    expect(
      await screen.findByText("Only platform staff can void commissions."),
    ).toBeInTheDocument();
  });

  it("closes the void modal without submitting when cancelled", async () => {
    mswServer.use(
      http.get(`${API_BASE}/commissions`, () =>
        okJson({ items: [commission()], nextCursor: null }),
      ),
    );

    renderSection();

    await userEvent.click(await screen.findByRole("button", { name: "Void" }));
    const dialog = await screen.findByRole("dialog", { name: "Void commission" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Void commission" })).not.toBeInTheDocument(),
    );
  });

  it("loads more commissions when there is a next page", async () => {
    mswServer.use(
      http.get(`${API_BASE}/commissions`, ({ request }) => {
        const cursor = new URL(request.url).searchParams.get("cursor");
        return okJson({
          items: cursor
            ? [commission({ id: "commission-2", creatorName: "Second Creator" })]
            : [commission()],
          nextCursor: cursor ? null : "cursor-1",
        });
      }),
    );

    renderSection();

    await screen.findByText("Asha Rai");
    await userEvent.click(await screen.findByRole("button", { name: "Load more" }));

    expect(await screen.findByText("Second Creator")).toBeInTheDocument();
  });

  it("shows a loading label on the load-more button while the next page fetches", async () => {
    mswServer.use(
      http.get(`${API_BASE}/commissions`, async ({ request }) => {
        const cursor = new URL(request.url).searchParams.get("cursor");
        if (cursor) await new Promise((resolve) => setTimeout(resolve, 40));
        return okJson({
          items: cursor ? [commission({ id: "commission-2" })] : [commission()],
          nextCursor: cursor ? null : "cursor-1",
        });
      }),
    );

    renderSection();

    await screen.findByText("Asha Rai");
    await userEvent.click(await screen.findByRole("button", { name: "Load more" }));

    expect(await screen.findByRole("button", { name: "Loading" })).toBeInTheDocument();
  });

  it("only offers void for an approved commission, no approve or mark-paid action", async () => {
    mswServer.use(
      http.get(`${API_BASE}/commissions`, () =>
        okJson({ items: [commission({ status: "APPROVED" })], nextCursor: null }),
      ),
    );

    renderSection();

    await screen.findByText("Asha Rai");
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark paid" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Void" })).toBeInTheDocument();
  });

  it("offers no action for a paid commission", async () => {
    mswServer.use(
      http.get(`${API_BASE}/commissions`, () =>
        okJson({ items: [commission({ status: "PAID" })], nextCursor: null }),
      ),
    );

    renderSection();

    await screen.findByText("Asha Rai");
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark paid" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Void" })).not.toBeInTheDocument();
  });
});
