import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { StageConfigModal } from "./StageConfigModal";

const API_BASE = "http://localhost:3000/api";

const STAGES = [
  { id: "s1", organizationId: "o1", name: "Lead", sortOrder: 0, isWon: false, isLost: false },
  { id: "s2", organizationId: "o1", name: "Won", sortOrder: 1, isWon: true, isLost: false },
];

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe("StageConfigModal", () => {
  it("adds, reorders and deletes stages", async () => {
    let addBody: unknown;
    let reorderBody: unknown;
    let deleted = false;
    mswServer.use(
      http.post(`${API_BASE}/crm/pipeline/stages`, async ({ request }) => {
        addBody = await request.json();
        return HttpResponse.json({ success: true, data: STAGES[0] }, { status: 201 });
      }),
      http.post(`${API_BASE}/crm/pipeline/stages/reorder`, async ({ request }) => {
        reorderBody = await request.json();
        return HttpResponse.json({ success: true, data: null });
      }),
      http.delete(`${API_BASE}/crm/pipeline/stages/s1`, () => {
        deleted = true;
        return HttpResponse.json({ success: true, data: null });
      }),
    );

    render(<StageConfigModal open onClose={() => {}} stages={STAGES} />, { wrapper });
    const user = userEvent.setup({ delay: null });

    await user.type(screen.getByPlaceholderText("New stage name"), "Negotiating");
    await user.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() => expect(addBody).toEqual({ name: "Negotiating" }));

    await user.click(screen.getByRole("button", { name: "Move Won up" }));
    await waitFor(() => expect(reorderBody).toEqual({ orderedStageIds: ["s2", "s1"] }));

    await user.click(screen.getByRole("button", { name: "Delete Lead" }));
    await waitFor(() => expect(deleted).toBe(true));
  });

  it("surfaces a mutation error", async () => {
    mswServer.use(
      http.delete(
        `${API_BASE}/crm/pipeline/stages/s1`,
        () =>
          new HttpResponse(JSON.stringify({ success: false, message: "Stage has deals." }), {
            status: 409,
          }),
      ),
    );

    render(<StageConfigModal open onClose={() => {}} stages={STAGES} />, { wrapper });
    const user = userEvent.setup({ delay: null });

    await user.click(screen.getByRole("button", { name: "Delete Lead" }));
    expect(await screen.findByText("Stage has deals.")).toBeInTheDocument();
  });
});
