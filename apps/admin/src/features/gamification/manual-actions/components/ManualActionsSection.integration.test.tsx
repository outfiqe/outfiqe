import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { ManualActionsSection } from "./ManualActionsSection";

const API_BASE = "*/api";

const manualAward = {
  id: "award-1",
  userId: "user-1",
  userName: "Asha Rai",
  userHandle: "asha",
  badgeId: "badge-1",
  badgeName: "Trendsetter",
  badgeIcon: "🔥",
  awardReason: "Won the contest",
  unlockedAt: "2026-09-01T00:00:00.000Z",
};

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
};

const stubReads = (awards: unknown[] = []) =>
  mswServer.use(
    http.get(`${API_BASE}/badges/admin`, () => HttpResponse.json({ success: true, data: [] })),
    http.get(`${API_BASE}/badges/user-badges/manual`, () =>
      HttpResponse.json({ success: true, data: awards }),
    ),
    http.get(`${API_BASE}/users/search`, () =>
      HttpResponse.json({
        success: true,
        data: [{ id: "user-1", name: "Asha Rai", handle: "asha", avatarUrl: null }],
      }),
    ),
  );

const requireElement = (element: HTMLElement | null | undefined): HTMLElement => {
  if (!element) throw new Error("Expected the element to be on the page.");
  return element;
};

const chooseUser = async (user: ReturnType<typeof userEvent.setup>, fieldId: string) => {
  await user.type(requireElement(document.getElementById(fieldId)), "asha");
  await user.click(await screen.findByText("Asha Rai"));
};

describe("ManualActionsSection", () => {
  it("shows inline messages and sends nothing when the badge award form is empty", async () => {
    stubReads();
    const awardRequested = vi.fn();
    mswServer.use(
      http.post(`${API_BASE}/badges/:badgeId/award`, () => {
        awardRequested();
        return HttpResponse.json({ success: true, data: { awarded: true } });
      }),
    );
    const user = userEvent.setup();
    render(<ManualActionsSection />, { wrapper });

    await user.click(await screen.findByRole("button", { name: "Award badge" }));

    expect(await screen.findByText("Choose a badge.")).toBeInTheDocument();
    expect(screen.getAllByText("Choose a user.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Enter a reason for the audit trail.").length).toBeGreaterThan(0);
    expect(awardRequested).not.toHaveBeenCalled();
  });

  it("explains a zero or decimal XP amount", async () => {
    stubReads();
    const user = userEvent.setup();
    render(<ManualActionsSection />, { wrapper });

    const amountField = await screen.findByLabelText("Amount (negative to dock XP)");
    await user.type(amountField, "0");
    await user.click(screen.getByRole("button", { name: "Adjust XP" }));
    expect(await screen.findByText("The amount must not be zero.")).toBeInTheDocument();

    await user.clear(amountField);
    await user.type(amountField, "2.5");
    await user.click(screen.getByRole("button", { name: "Adjust XP" }));
    expect(
      await screen.findByText("Use a whole number, with a minus sign to dock XP."),
    ).toBeInTheDocument();
  });

  it("adjusts XP for a chosen user and shows a success toast", async () => {
    stubReads();
    let adjustBody: unknown;
    mswServer.use(
      http.post(`${API_BASE}/xp/adjust`, async ({ request }) => {
        adjustBody = await request.json();
        return HttpResponse.json({
          success: true,
          data: {
            awarded: true,
            amount: -50,
            totalXp: 450,
            previousLevel: { level: 2, name: "Regular" },
            currentLevel: { level: 2, name: "Regular" },
            leveledUp: false,
          },
        });
      }),
    );
    const user = userEvent.setup();
    render(<ManualActionsSection />, { wrapper });

    await screen.findByRole("button", { name: "Adjust XP" });
    await chooseUser(user, "adjust-xp-user");
    await user.type(screen.getByLabelText("Amount (negative to dock XP)"), "-50");
    await user.type(
      requireElement(screen.getAllByLabelText("Reason").at(-1)),
      "Reversed a bad award",
    );
    await user.click(screen.getByRole("button", { name: "Adjust XP" }));

    await waitFor(() =>
      expect(adjustBody).toEqual({
        userId: "user-1",
        amount: -50,
        reason: "Reversed a bad award",
      }),
    );
    expect(await screen.findByText("XP adjusted.")).toBeInTheDocument();
    expect(await screen.findByText("New total: 450 XP")).toBeInTheDocument();
  });

  it("asks for a reason before removing a manual award, then shows a success toast", async () => {
    stubReads([manualAward]);
    mswServer.use(
      http.post(`${API_BASE}/badges/user-badges/award-1/remove`, () =>
        HttpResponse.json({ success: true, data: null }),
      ),
    );
    const user = userEvent.setup();
    render(<ManualActionsSection />, { wrapper });

    await user.click(await screen.findByRole("button", { name: "Remove" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Remove" }));
    expect(await screen.findByText("Enter a reason for removing this award.")).toBeInTheDocument();

    await user.type(
      screen.getByRole("textbox", { name: /Reason for removing/ }),
      "Awarded by mistake",
    );
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Remove" }));

    expect(await screen.findByText("Manual award removed.")).toBeInTheDocument();
  });
});
