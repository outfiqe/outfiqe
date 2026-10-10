import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { BrandExemptionsSection } from "./BrandExemptionsSection";

const API_BASE = "http://localhost:3000/api";

const exemption = (id: string, brandName: string) => ({
  id,
  brandId: `brand-${id}`,
  brandName,
  startsAt: "2026-01-01T00:00:00.000Z",
  endsAt: "2026-02-01T00:00:00.000Z",
  reason: "Launch cohort, first 10 brands",
  createdAt: "2026-01-01T00:00:00.000Z",
  revokedAt: null,
});

const okJson = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const renderSection = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
  return render(<BrandExemptionsSection />, { wrapper });
};

describe("BrandExemptionsSection", () => {
  it("revokes an exemption once the confirmation dialog is accepted", async () => {
    let revokeCalled = false;
    mswServer.use(
      http.get(`${API_BASE}/brand-payouts/exemptions`, () =>
        okJson([exemption("exemption-1", "Kastha Studio")]),
      ),
      http.patch(`${API_BASE}/brand-payouts/exemptions/exemption-1/revoke`, () => {
        revokeCalled = true;
        return okJson(null);
      }),
    );

    const user = userEvent.setup();
    renderSection();

    await user.click(await screen.findByRole("button", { name: "Revoke" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Revoke" }));

    expect(revokeCalled).toBe(true);
  });

  it("shows an error toast when revoking an exemption fails", async () => {
    mswServer.use(
      http.get(`${API_BASE}/brand-payouts/exemptions`, () =>
        okJson([exemption("exemption-1", "Kastha Studio")]),
      ),
      http.patch(`${API_BASE}/brand-payouts/exemptions/exemption-1/revoke`, () =>
        HttpResponse.json(
          { success: false, message: "Only platform staff can revoke exemptions." },
          { status: 403 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderSection();

    await user.click(await screen.findByRole("button", { name: "Revoke" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Revoke" }));

    expect(
      await screen.findByText("Only platform staff can revoke exemptions."),
    ).toBeInTheDocument();
  });

  it("shows an empty state when there are no exemptions", async () => {
    mswServer.use(http.get(`${API_BASE}/brand-payouts/exemptions`, () => okJson([])));

    renderSection();

    expect(await screen.findByText("No exemptions yet.")).toBeInTheDocument();
  });

  it("names each missing field inline, not in a browser popup, and sends nothing", async () => {
    const createRequested = vi.fn();
    mswServer.use(
      http.get(`${API_BASE}/brand-payouts/exemptions`, () => okJson([])),
      http.post(`${API_BASE}/brand-payouts/exemptions`, () => {
        createRequested();
        return okJson(exemption("new", "Acme"));
      }),
    );

    renderSection();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Add exemption" }));

    expect(await screen.findByText("Pick the brand this exemption is for.")).toBeInTheDocument();
    expect(screen.getByText("Choose a start date.")).toBeInTheDocument();
    expect(screen.getByText("Choose an end date.")).toBeInTheDocument();
    expect(screen.getByText("Explain why this brand is exempt.")).toBeInTheDocument();
    expect(createRequested).not.toHaveBeenCalled();
  });

  it("explains an end date that is not after the start date", async () => {
    mswServer.use(http.get(`${API_BASE}/brand-payouts/exemptions`, () => okJson([])));

    renderSection();
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText("Starts"), "2026-10-10");
    await user.type(screen.getByLabelText("Ends"), "2026-10-01");
    await user.click(screen.getByRole("button", { name: "Add exemption" }));

    expect(
      await screen.findByText("The end date must be after the start date."),
    ).toBeInTheDocument();
  });
});
