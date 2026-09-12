import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
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

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
  return render(<CreatorsPage />, { wrapper });
};

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
});
