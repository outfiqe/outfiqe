import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { LevelsSection } from "./LevelsSection";

const API_BASE = "*/api";

const levelRow = {
  id: "level-1",
  level: 1,
  name: "Newcomer",
  requiredXp: 0,
  icon: null,
  isActive: true,
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

const stubLevels = (rows: unknown[] = []) =>
  mswServer.use(
    http.get(`${API_BASE}/xp/levels`, () => HttpResponse.json({ success: true, data: rows })),
  );

const fillNewLevel = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(await screen.findByLabelText("Level number"), "2");
  await user.type(screen.getByLabelText("Name"), "Regular");
  await user.type(screen.getByLabelText("Required XP"), "500");
};

describe("LevelsSection", () => {
  it("shows inline messages, not a browser popup, and sends nothing for an empty form", async () => {
    stubLevels();
    const createRequested = vi.fn();
    mswServer.use(
      http.post(`${API_BASE}/xp/levels`, () => {
        createRequested();
        return HttpResponse.json({ success: true, data: levelRow });
      }),
    );
    const user = userEvent.setup();
    render(<LevelsSection />, { wrapper });

    await user.click(await screen.findByRole("button", { name: "Add level" }));

    expect(await screen.findByText("Enter a level number.")).toBeInTheDocument();
    expect(screen.getByText("Enter a name for the level.")).toBeInTheDocument();
    expect(screen.getByText("Enter the required XP.")).toBeInTheDocument();
    expect(createRequested).not.toHaveBeenCalled();
  });

  it("adds a level and shows a success toast", async () => {
    stubLevels();
    let createBody: unknown;
    mswServer.use(
      http.post(`${API_BASE}/xp/levels`, async ({ request }) => {
        createBody = await request.json();
        return HttpResponse.json({ success: true, data: levelRow }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    render(<LevelsSection />, { wrapper });

    await fillNewLevel(user);
    await user.click(screen.getByRole("button", { name: "Add level" }));

    await waitFor(() => expect(createBody).toEqual({ level: 2, name: "Regular", requiredXp: 500 }));
    expect(await screen.findByText("Level added.")).toBeInTheDocument();
  });

  it("saves an edited level and shows a success toast", async () => {
    stubLevels([levelRow]);
    mswServer.use(
      http.patch(`${API_BASE}/xp/levels/level-1`, () =>
        HttpResponse.json({ success: true, data: levelRow }),
      ),
    );
    const user = userEvent.setup();
    render(<LevelsSection />, { wrapper });

    await user.click(await screen.findByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Level updated.")).toBeInTheDocument();
  });

  it("shows the server's reason when adding fails", async () => {
    stubLevels();
    mswServer.use(
      http.post(`${API_BASE}/xp/levels`, () =>
        HttpResponse.json({ success: false, message: "Level 2 already exists." }, { status: 409 }),
      ),
    );
    const user = userEvent.setup();
    render(<LevelsSection />, { wrapper });

    await fillNewLevel(user);
    await user.click(screen.getByRole("button", { name: "Add level" }));

    expect(await screen.findByText("Level 2 already exists.")).toBeInTheDocument();
  });
});
