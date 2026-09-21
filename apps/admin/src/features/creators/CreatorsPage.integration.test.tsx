import { Toaster } from "@outfiqe/design-system";
import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { CreatorsPage } from "./CreatorsPage";

const API_BASE = "http://localhost:3000/api";

const creator = (userId: string, name: string) => ({
  userId,
  name,
  email: `${name.toLowerCase()}@outfiqe.test`,
  isCreator: true,
  creatorStatus: "PENDING" as const,
});

const okJson = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const renderPage = () =>
  renderWithRouter(
    <>
      <CreatorsPage />
      <Toaster />
    </>,
    { path: "/creators" },
  );

describe("CreatorsPage", () => {
  it("approves a pending creator", async () => {
    let approveCalled = false;
    mswServer.use(
      http.get(`${API_BASE}/creators`, () =>
        okJson({ creators: [creator("user-1", "Ava")], nextCursor: null }),
      ),
      http.post(`${API_BASE}/creators/user-1/approve`, () => {
        approveCalled = true;
        return okJson(null);
      }),
    );

    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Approve" }));

    expect(approveCalled).toBe(true);
    expect(await screen.findByText("Creator approved.")).toBeInTheDocument();
  });

  it("shows an error toast when approving a creator fails", async () => {
    mswServer.use(
      http.get(`${API_BASE}/creators`, () =>
        okJson({ creators: [creator("user-1", "Ava")], nextCursor: null }),
      ),
      http.post(`${API_BASE}/creators/user-1/approve`, () =>
        HttpResponse.json(
          { success: false, message: "Only platform staff can approve creators." },
          { status: 403 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Approve" }));

    expect(
      await screen.findByText("Only platform staff can approve creators."),
    ).toBeInTheDocument();
  });

  it("shows an error toast when rejecting a creator fails", async () => {
    mswServer.use(
      http.get(`${API_BASE}/creators`, () =>
        okJson({ creators: [creator("user-1", "Ava")], nextCursor: null }),
      ),
      http.post(`${API_BASE}/creators/user-1/reject`, () =>
        HttpResponse.json(
          { success: false, message: "Only platform staff can reject creators." },
          { status: 403 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Reject" }));

    expect(await screen.findByText("Only platform staff can reject creators.")).toBeInTheDocument();
  });

  it("shows an empty state when there are no creators in the tab", async () => {
    mswServer.use(
      http.get(`${API_BASE}/creators`, () => okJson({ creators: [], nextCursor: null })),
    );

    renderPage();

    expect(await screen.findByText("Nothing here right now.")).toBeInTheDocument();
  });

  it("reads the status filter from the URL on load", async () => {
    const requestedStatuses: (string | null)[] = [];
    mswServer.use(
      http.get(`${API_BASE}/creators`, ({ request }) => {
        requestedStatuses.push(new URL(request.url).searchParams.get("status"));
        return okJson({ creators: [], nextCursor: null });
      }),
    );

    renderWithRouter(
      <>
        <CreatorsPage />
        <Toaster />
      </>,
      { path: "/creators", initialEntry: "/creators?status=APPROVED" },
    );

    await waitFor(() => expect(requestedStatuses).toContain("APPROVED"));
  });

  it("puts the chosen status in the URL and refetches", async () => {
    const requestedStatuses: (string | null)[] = [];
    mswServer.use(
      http.get(`${API_BASE}/creators`, ({ request }) => {
        requestedStatuses.push(new URL(request.url).searchParams.get("status"));
        return okJson({ creators: [], nextCursor: null });
      }),
    );

    const { router } = renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Rejected" }));

    await waitFor(() => expect(router.state.location.search).toEqual({ status: "REJECTED" }));
    await waitFor(() => expect(requestedStatuses).toContain("REJECTED"));
  });
});
