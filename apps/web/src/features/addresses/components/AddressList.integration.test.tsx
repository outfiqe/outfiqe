import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth";
import type * as DeliveryZonesModule from "@/features/delivery-zones";

import { AddressList } from "./AddressList";

vi.mock("@/features/auth", () => ({ useAuth: vi.fn() }));

vi.mock("@/features/delivery-zones", async () => {
  const actual = await vi.importActual<typeof DeliveryZonesModule>("@/features/delivery-zones");
  return {
    ...actual,
    CityAutocomplete: ({
      value,
      onChange,
    }: {
      value: string;
      onChange: (city: string) => void;
    }) => (
      <input aria-label="City" value={value} onChange={(event) => onChange(event.target.value)} />
    ),
  };
});

type SavedAddress = {
  id: string;
  label: string | null;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  landmark: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

const anAddress = (overrides: Partial<SavedAddress> = {}): SavedAddress => ({
  id: "addr-1",
  label: "Home",
  fullName: "Sita Devi",
  phone: "9811111111",
  address: "Jhamsikhel, Ward 3",
  city: "Lalitpur",
  landmark: null,
  isDefault: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const listResponse = (addresses: SavedAddress[]) =>
  HttpResponse.json({ success: true, message: "ok", data: addresses });

const renderList = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
  return render(<AddressList />, { wrapper });
};

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated: true,
    isAuthResolved: true,
  } as ReturnType<typeof useAuth>);
});

describe("AddressList", () => {
  it("shows the empty state when there are no saved addresses", async () => {
    mswServer.use(http.get("/api/addresses", () => listResponse([])));
    renderList();

    expect(await screen.findByText(/no saved addresses yet/i)).toBeInTheDocument();
  });

  it("renders each saved address with its default badge", async () => {
    mswServer.use(
      http.get("/api/addresses", () =>
        listResponse([
          anAddress(),
          anAddress({
            id: "addr-2",
            label: "Office",
            fullName: "Ram Bahadur",
            isDefault: false,
          }),
        ]),
      ),
    );
    renderList();

    expect(await screen.findByText("Sita Devi")).toBeInTheDocument();
    expect(screen.getByText("Ram Bahadur")).toBeInTheDocument();
    expect(screen.getByText("Office")).toBeInTheDocument();
    expect(screen.getByText("Default")).toBeInTheDocument();
  });

  it("adds an address through the modal", async () => {
    const addresses = [anAddress()];
    let created: unknown;
    mswServer.use(
      http.get("/api/addresses", () => listResponse(addresses)),
      http.post("/api/addresses", async ({ request }) => {
        created = await request.json();
        const newAddress = anAddress({ id: "addr-new", label: "Office", isDefault: false });
        addresses.push(newAddress);
        return HttpResponse.json({ success: true, message: "ok", data: newAddress });
      }),
    );

    const user = userEvent.setup();
    renderList();
    await screen.findByText("Sita Devi");

    await user.click(screen.getByRole("button", { name: /add address/i }));
    const dialog = await screen.findByRole("dialog");

    await user.type(within(dialog).getByLabelText(/label/i), "Office");
    await user.type(within(dialog).getByLabelText(/full name/i), "Sita Devi");
    await user.type(within(dialog).getByLabelText(/^phone$/i), "9822222222");
    await user.type(within(dialog).getByLabelText(/^address$/i), "Pulchowk, Ward 3");
    await user.type(within(dialog).getByLabelText("City"), "Lalitpur");
    await user.click(within(dialog).getByRole("button", { name: /add address/i }));

    await waitFor(() =>
      expect(created).toMatchObject({ label: "Office", city: "Lalitpur", isDefault: false }),
    );
  });

  it("sets a non-default address as default from its card", async () => {
    mswServer.use(
      http.get("/api/addresses", () =>
        listResponse([anAddress(), anAddress({ id: "addr-2", label: "Office", isDefault: false })]),
      ),
    );
    let defaultedId: string | undefined;
    mswServer.use(
      http.patch("/api/addresses/:id/default", ({ params }) => {
        defaultedId = params.id as string;
        return HttpResponse.json({ success: true, message: "ok", data: null });
      }),
    );

    const user = userEvent.setup();
    renderList();

    await screen.findByText("Office");
    await user.click(screen.getByRole("button", { name: /set as default/i }));

    await waitFor(() => expect(defaultedId).toBe("addr-2"));
  });

  it("deletes an address after confirming", async () => {
    mswServer.use(http.get("/api/addresses", () => listResponse([anAddress()])));
    let deletedId: string | undefined;
    mswServer.use(
      http.delete("/api/addresses/:id", ({ params }) => {
        deletedId = params.id as string;
        return HttpResponse.json({ success: true, message: "ok", data: null });
      }),
    );

    const user = userEvent.setup();
    renderList();

    await user.click((await screen.findAllByRole("button", { name: /^delete$/i }))[0]!);
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /^delete$/i }));

    await waitFor(() => expect(deletedId).toBe("addr-1"));
  });
});
