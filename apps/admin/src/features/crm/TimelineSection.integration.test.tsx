import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { TimelineSection } from "./TimelineSection";

const API_BASE = "http://localhost:3000/api";

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe("TimelineSection", () => {
  it("renders merged activity and order entries", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/timeline`, () =>
        HttpResponse.json({
          success: true,
          data: {
            partial: false,
            entries: [
              {
                kind: "activity",
                id: "activity:a1",
                at: "2026-08-21T10:00:00.000Z",
                activityType: "CALL",
                body: "Talked restock",
                authorName: "Bipin",
              },
              {
                kind: "order",
                id: "order:o1",
                at: "2026-08-20T10:00:00.000Z",
                orderId: "abcdef12-0000-0000-0000-000000000000",
                itemCount: 2,
                amount: 3000,
                paymentStatus: "PAID",
                fulfilmentStatus: "DELIVERED",
              },
            ],
          },
        }),
      ),
    );

    render(<TimelineSection subjectType="customer" subjectId="c-1" />, { wrapper });

    expect(await screen.findByText(/Talked restock/)).toBeInTheDocument();
    expect(screen.getByText(/Rs\. 3,000/)).toBeInTheDocument();
  });

  it("shows the partial notice when live history is unavailable and lets a note be logged", async () => {
    let posted: unknown;
    mswServer.use(
      http.get(`${API_BASE}/crm/timeline`, () =>
        HttpResponse.json({ success: true, data: { partial: true, entries: [] } }),
      ),
      http.post(`${API_BASE}/crm/activities`, async ({ request }) => {
        posted = await request.json();
        return HttpResponse.json({ success: true, data: {} }, { status: 201 });
      }),
    );

    render(<TimelineSection subjectType="partner" subjectId="p-1" />, { wrapper });
    const user = userEvent.setup();

    expect(
      await screen.findByText(/live order history is temporarily unavailable/i),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("Activity note"), "Following up");
    await user.click(screen.getByRole("button", { name: "Log" }));

    await waitFor(() =>
      expect(posted).toMatchObject({
        subjectType: "partner",
        subjectId: "p-1",
        type: "NOTE",
        body: "Following up",
      }),
    );
  });
});
