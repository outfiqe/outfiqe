import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { ActivityConfigSection } from "./index";

const API_BASE = "*/api";

const activityConfig = {
  activityType: "POST_CREATED",
  enabled: true,
  xpAmount: 10,
  dailyLimit: 5,
  cooldownSeconds: null,
  maxPerEntity: null,
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

const stubConfigs = () =>
  mswServer.use(
    http.get(`${API_BASE}/xp/activity-config`, () =>
      HttpResponse.json({ success: true, data: [activityConfig] }),
    ),
  );

describe("ActivityConfigSection", () => {
  it("shows inline messages and sends nothing when fields are invalid", async () => {
    stubConfigs();
    const saveRequested = vi.fn();
    mswServer.use(
      http.patch(`${API_BASE}/xp/activity-config/POST_CREATED`, () => {
        saveRequested();
        return HttpResponse.json({ success: true, data: activityConfig });
      }),
    );
    const user = userEvent.setup();
    render(<ActivityConfigSection />, { wrapper });

    await user.click(await screen.findByRole("button", { name: "Edit" }));
    await user.clear(screen.getByLabelText("XP amount"));
    await user.clear(screen.getByLabelText("Daily limit"));
    await user.type(screen.getByLabelText("Daily limit"), "0");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Enter an XP amount.")).toBeInTheDocument();
    expect(
      screen.getByText("Use a number that is at least 1, or leave blank for no limit."),
    ).toBeInTheDocument();
    expect(saveRequested).not.toHaveBeenCalled();
  });

  it("saves the settings and shows a success toast", async () => {
    stubConfigs();
    let saveBody: unknown;
    mswServer.use(
      http.patch(`${API_BASE}/xp/activity-config/POST_CREATED`, async ({ request }) => {
        saveBody = await request.json();
        return HttpResponse.json({ success: true, data: activityConfig });
      }),
    );
    const user = userEvent.setup();
    render(<ActivityConfigSection />, { wrapper });

    await user.click(await screen.findByRole("button", { name: "Edit" }));
    const xpField = screen.getByLabelText("XP amount");
    await user.clear(xpField);
    await user.type(xpField, "25");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(saveBody).toMatchObject({ xpAmount: 25, dailyLimit: 5 }));
    expect(await screen.findByText("Activity XP settings saved.")).toBeInTheDocument();
  });

  it("shows the server's reason when saving fails", async () => {
    stubConfigs();
    mswServer.use(
      http.patch(`${API_BASE}/xp/activity-config/POST_CREATED`, () =>
        HttpResponse.json({ success: false, message: "Could not save." }, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    render(<ActivityConfigSection />, { wrapper });

    await user.click(await screen.findByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Could not save.")).toBeInTheDocument();
  });
});
