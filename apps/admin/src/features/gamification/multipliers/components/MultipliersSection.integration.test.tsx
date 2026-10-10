import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { MultipliersSection } from "./MultipliersSection";

const API_BASE = "*/api";

const multiplierRow = {
  id: "mult-1",
  label: "Founders Weekend",
  multiplier: 2,
  startsAt: "2026-10-01T10:00:00.000Z",
  endsAt: "2026-10-03T10:00:00.000Z",
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

const stubMultipliers = (rows: unknown[] = []) =>
  mswServer.use(
    http.get(`${API_BASE}/xp/multipliers`, () => HttpResponse.json({ success: true, data: rows })),
  );

describe("MultipliersSection", () => {
  it("shows inline messages, not a browser popup, and sends nothing for an empty form", async () => {
    stubMultipliers();
    const createRequested = vi.fn();
    mswServer.use(
      http.post(`${API_BASE}/xp/multipliers`, () => {
        createRequested();
        return HttpResponse.json({ success: true, data: multiplierRow });
      }),
    );
    const user = userEvent.setup();
    render(<MultipliersSection />, { wrapper });

    await user.click(await screen.findByRole("button", { name: "Add multiplier" }));

    expect(await screen.findByText("Enter a label for the multiplier.")).toBeInTheDocument();
    expect(screen.getByText("Choose when the multiplier ends.")).toBeInTheDocument();
    expect(createRequested).not.toHaveBeenCalled();
  });

  it("explains a multiplier outside the allowed range", async () => {
    stubMultipliers();
    const user = userEvent.setup();
    render(<MultipliersSection />, { wrapper });

    const multiplierField = await screen.findByLabelText("Multiplier");
    await user.clear(multiplierField);
    await user.type(multiplierField, "25");
    await user.click(screen.getByRole("button", { name: "Add multiplier" }));

    expect(await screen.findByText("Use a number from 1 to 10.")).toBeInTheDocument();
  });

  it("adds a multiplier and shows a success toast", async () => {
    stubMultipliers();
    let createBody: unknown;
    mswServer.use(
      http.post(`${API_BASE}/xp/multipliers`, async ({ request }) => {
        createBody = await request.json();
        return HttpResponse.json({ success: true, data: multiplierRow }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    render(<MultipliersSection />, { wrapper });

    await user.type(await screen.findByLabelText("Label"), "Founders Weekend");
    await user.type(screen.getByLabelText("Ends"), "2030-01-01T10:00");
    await user.click(screen.getByRole("button", { name: "Add multiplier" }));

    await waitFor(() =>
      expect(createBody).toMatchObject({ label: "Founders Weekend", multiplier: 2 }),
    );
    expect(await screen.findByText("XP multiplier added.")).toBeInTheDocument();
  });

  it("saves an edited multiplier and shows a success toast", async () => {
    stubMultipliers([multiplierRow]);
    mswServer.use(
      http.patch(`${API_BASE}/xp/multipliers/mult-1`, () =>
        HttpResponse.json({ success: true, data: multiplierRow }),
      ),
    );
    const user = userEvent.setup();
    render(<MultipliersSection />, { wrapper });

    await user.click(await screen.findByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("XP multiplier updated.")).toBeInTheDocument();
  });

  it("shows the server's reason when adding fails", async () => {
    stubMultipliers();
    mswServer.use(
      http.post(`${API_BASE}/xp/multipliers`, () =>
        HttpResponse.json({ success: false, message: "Multiplier overlaps." }, { status: 409 }),
      ),
    );
    const user = userEvent.setup();
    render(<MultipliersSection />, { wrapper });

    await user.type(await screen.findByLabelText("Label"), "Overlap");
    await user.type(screen.getByLabelText("Ends"), "2030-01-01T10:00");
    await user.click(screen.getByRole("button", { name: "Add multiplier" }));

    expect(await screen.findByText("Multiplier overlaps.")).toBeInTheDocument();
  });
});
