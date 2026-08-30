import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { DealFormModal } from "./DealFormModal";
import type { Deal } from "./pipelineSchemas";

const API_BASE = "http://localhost:3000/api";

const STAGES = [
  { id: "s1", organizationId: "o1", name: "Lead", sortOrder: 0, isWon: false, isLost: false },
  { id: "s2", organizationId: "o1", name: "Won", sortOrder: 1, isWon: true, isLost: false },
];

const DEAL: Deal = {
  id: "d1",
  organizationId: "o1",
  stageId: "s1",
  stageName: "Lead",
  title: "Spring collab",
  value: 4000,
  currency: "NPR",
  expectedCloseDate: null,
  ownerMembershipId: null,
  ownerName: null,
  partnerCreatorId: "u1",
  partnerName: "Aasha",
  partnerHandle: "aasha",
  status: "OPEN",
  closedAt: null,
  createdAt: "2026-08-20T00:00:00.000Z",
};

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe("DealFormModal", () => {
  it("creates a deal with a partner picked from the fetched options", async () => {
    let body: unknown;
    mswServer.use(
      http.get(`${API_BASE}/crm/partners`, () =>
        HttpResponse.json({
          success: true,
          data: {
            items: [
              {
                creatorId: "u1",
                name: "Aasha",
                handle: "aasha",
                avatarUrl: null,
                tagClickCount: 0,
                attributedOrderCount: 0,
                attributedRevenue: 0,
                lastActivityAt: null,
              },
            ],
            total: 1,
            hasMore: false,
            reason: null,
          },
        }),
      ),
      http.post(`${API_BASE}/crm/deals`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ success: true, data: DEAL }, { status: 201 });
      }),
    );

    render(<DealFormModal open onClose={() => {}} stages={STAGES} deal={null} />, { wrapper });
    const user = userEvent.setup({ delay: null });

    await user.type(screen.getByLabelText("Title"), "Autumn drop");
    await user.selectOptions(await screen.findByLabelText("Partner"), "u1");
    await user.click(screen.getByRole("button", { name: "Create deal" }));

    await waitFor(() =>
      expect(body).toMatchObject({ title: "Autumn drop", stageId: "s1", partnerCreatorId: "u1" }),
    );
  });

  it("edits an existing deal without the partner field", async () => {
    let body: unknown;
    mswServer.use(
      http.patch(`${API_BASE}/crm/deals/d1`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ success: true, data: { ...DEAL, stageId: "s2" } });
      }),
    );

    render(<DealFormModal open onClose={() => {}} stages={STAGES} deal={DEAL} />, { wrapper });
    const user = userEvent.setup({ delay: null });

    expect(screen.queryByLabelText("Partner")).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Stage"), "s2");
    await user.click(screen.getByRole("button", { name: "Save deal" }));

    await waitFor(() => expect(body).toMatchObject({ stageId: "s2", title: "Spring collab" }));
  });
});
