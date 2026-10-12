import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { DeliveryZonesSection } from "./DeliveryZonesSection";

const API_BASE = "http://localhost:3000/api";

const zone = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "zone-1",
  name: "Kathmandu Valley",
  isDefault: false,
  cities: ["Lalitpur"],
  standardDeliveryFee: 100,
  freeDeliveryThreshold: 3000,
  codHandlingFee: 50,
  updatedAt: "2026-09-01T00:00:00.000Z",
  ...overrides,
});

const okJson = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
};

const renderSection = () => render(<DeliveryZonesSection />, { wrapper });

const stubZones = (zones: ReturnType<typeof zone>[] = []) =>
  mswServer.use(http.get(`${API_BASE}/delivery-zones`, () => okJson(zones)));

describe("DeliveryZonesSection", () => {
  it("names each missing field inline, not in a browser popup, and sends nothing", async () => {
    stubZones();
    const createRequested = vi.fn();
    mswServer.use(
      http.post(`${API_BASE}/delivery-zones`, () => {
        createRequested();
        return okJson(zone());
      }),
    );
    const user = userEvent.setup();
    renderSection();

    await user.click(await screen.findByRole("button", { name: "Add zone" }));

    expect(await screen.findByText("Enter a name for the zone.")).toBeInTheDocument();
    expect(screen.getByText("Enter a standard delivery fee.")).toBeInTheDocument();
    expect(screen.getByText("Enter a free delivery threshold.")).toBeInTheDocument();
    expect(screen.getByText("Enter a COD handling fee.")).toBeInTheDocument();
    expect(createRequested).not.toHaveBeenCalled();
  });

  it("explains a fee with decimals and does not send it", async () => {
    stubZones();
    const createRequested = vi.fn();
    mswServer.use(
      http.post(`${API_BASE}/delivery-zones`, () => {
        createRequested();
        return okJson(zone());
      }),
    );
    const user = userEvent.setup();
    renderSection();

    await user.type(await screen.findByLabelText("Zone name"), "Pokhara");
    await user.type(screen.getByLabelText("Standard delivery fee (Rs.)"), "99.5");
    await user.type(screen.getByLabelText("Free delivery threshold (Rs.)"), "3000");
    await user.type(screen.getByLabelText("COD handling fee (Rs.)"), "50");
    await user.click(screen.getByRole("button", { name: "Add zone" }));

    expect(
      await screen.findByText("Use a whole number with no decimals or minus sign."),
    ).toBeInTheDocument();
    expect(createRequested).not.toHaveBeenCalled();
  });

  it("adds a zone, clears the form and shows a success toast", async () => {
    stubZones();
    let createBody: unknown;
    mswServer.use(
      http.post(`${API_BASE}/delivery-zones`, async ({ request }) => {
        createBody = await request.json();
        return okJson(zone({ name: "Pokhara" }));
      }),
    );
    const user = userEvent.setup();
    renderSection();

    const nameField = await screen.findByLabelText("Zone name");
    await user.type(nameField, "Pokhara");
    await user.type(screen.getByLabelText("Standard delivery fee (Rs.)"), "150");
    await user.type(screen.getByLabelText("Free delivery threshold (Rs.)"), "4000");
    await user.type(screen.getByLabelText("COD handling fee (Rs.)"), "60");
    await user.click(screen.getByRole("button", { name: "Add zone" }));

    await waitFor(() =>
      expect(createBody).toEqual({
        name: "Pokhara",
        cities: [],
        standardDeliveryFee: 150,
        freeDeliveryThreshold: 4000,
        codHandlingFee: 60,
      }),
    );
    expect(await screen.findByText("Delivery zone added.")).toBeInTheDocument();
    await waitFor(() => expect(nameField).toHaveValue(""));
  });

  it("shows the server's reason when adding a zone fails", async () => {
    stubZones();
    mswServer.use(
      http.post(`${API_BASE}/delivery-zones`, () =>
        HttpResponse.json(
          { success: false, message: "A zone with that name already exists." },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderSection();

    await user.type(await screen.findByLabelText("Zone name"), "Pokhara");
    await user.type(screen.getByLabelText("Standard delivery fee (Rs.)"), "150");
    await user.type(screen.getByLabelText("Free delivery threshold (Rs.)"), "4000");
    await user.type(screen.getByLabelText("COD handling fee (Rs.)"), "60");
    await user.click(screen.getByRole("button", { name: "Add zone" }));

    expect(await screen.findByText("A zone with that name already exists.")).toBeInTheDocument();
    expect(screen.getByLabelText("Zone name")).toHaveValue("Pokhara");
  });

  it("makes a zone the default and shows a success toast", async () => {
    stubZones([zone()]);
    mswServer.use(
      http.patch(`${API_BASE}/delivery-zones/zone-1/default`, () =>
        okJson(zone({ isDefault: true })),
      ),
    );
    const user = userEvent.setup();
    renderSection();

    await user.click(await screen.findByRole("button", { name: "Set as default" }));

    expect(await screen.findByText("Default zone changed.")).toBeInTheDocument();
  });
});
