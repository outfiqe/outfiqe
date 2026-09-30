import { Toaster } from "@outfiqe/design-system";
import { mswServer } from "@test/integration/msw/server";
import { createTranslatedQueryWrapper } from "@test/integration/translationsWrapper";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth";

import type { SavedSize } from "../api/savedSizesApi";
import { MySizesSettings } from "./MySizesSettings";

vi.mock("@/features/auth", () => ({ useAuth: vi.fn() }));

const MY_SIZES_URL = "/api/saved-sizes/me";
const SERVER_ERROR_STATUS = 500;

const ok = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const kurtaSizes = (overrides: Partial<SavedSize> = {}): SavedSize => ({
  productTypeId: "type-kurta",
  productTypeSlug: "kurta-set",
  productTypeLabel: "Kurta set",
  sizeOptions: ["S", "M", "L"],
  savedSize: null,
  lastBoughtSize: null,
  ...overrides,
});

const renderSettings = () => {
  const { Wrapper } = createTranslatedQueryWrapper();
  return render(
    <>
      <MySizesSettings />
      <Toaster />
    </>,
    { wrapper: Wrapper },
  );
};

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>);
});

describe("MySizesSettings", () => {
  it("saves the size picked for a kind of clothing", async () => {
    const savedBodies: unknown[] = [];
    mswServer.use(
      http.get(MY_SIZES_URL, () => ok([kurtaSizes()])),
      http.put(`${MY_SIZES_URL}/type-kurta`, async ({ request }) => {
        savedBodies.push(await request.json());
        return ok([kurtaSizes({ savedSize: "L" })]);
      }),
    );
    renderSettings();
    const user = userEvent.setup();

    await user.selectOptions(await screen.findByLabelText("Your size for Kurta set"), "L");

    await waitFor(() => expect(savedBodies).toEqual([{ sizeLabel: "L" }]));
    expect(await screen.findByText("Size saved.")).toBeInTheDocument();
    expect(screen.getByLabelText("Your size for Kurta set")).toHaveValue("L");
  });

  it("suggests the size last bought and saves it in one tap", async () => {
    mswServer.use(
      http.get(MY_SIZES_URL, () => ok([kurtaSizes({ lastBoughtSize: "M" })])),
      http.put(`${MY_SIZES_URL}/type-kurta`, () => ok([kurtaSizes({ savedSize: "M" })])),
    );
    renderSettings();
    const user = userEvent.setup();

    expect(await screen.findByText(/You last bought M\./)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save M" }));

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Save M" })).not.toBeInTheDocument(),
    );
    expect(screen.getByLabelText("Your size for Kurta set")).toHaveValue("M");
  });

  it("clears a saved size", async () => {
    mswServer.use(
      http.get(MY_SIZES_URL, () => ok([kurtaSizes({ savedSize: "S" })])),
      http.delete(`${MY_SIZES_URL}/type-kurta`, () => ok([kurtaSizes()])),
    );
    renderSettings();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Clear Kurta set size" }));

    expect(await screen.findByText("Size cleared.")).toBeInTheDocument();
    expect(screen.getByLabelText("Your size for Kurta set")).toHaveValue("");
  });

  it("tells the person when saving fails", async () => {
    mswServer.use(
      http.get(MY_SIZES_URL, () => ok([kurtaSizes()])),
      http.put(`${MY_SIZES_URL}/type-kurta`, () =>
        HttpResponse.json(
          { success: false, message: "Nope", code: "INTERNAL" },
          { status: SERVER_ERROR_STATUS },
        ),
      ),
    );
    renderSettings();
    const user = userEvent.setup();

    await user.selectOptions(await screen.findByLabelText("Your size for Kurta set"), "S");

    expect(await screen.findByText("Couldn't save your size. Try again.")).toBeInTheDocument();
  });

  it("shows an empty state and a retry when loading fails", async () => {
    mswServer.use(
      http.get(MY_SIZES_URL, () =>
        HttpResponse.json(
          { success: false, message: "Nope", code: "INTERNAL" },
          { status: SERVER_ERROR_STATUS },
        ),
      ),
    );
    renderSettings();
    const user = userEvent.setup();

    expect(await screen.findByText("Couldn't load your sizes. Try again.")).toBeInTheDocument();

    mswServer.use(http.get(MY_SIZES_URL, () => ok([])));
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(
      await screen.findByText("There are no kinds of clothing to size yet."),
    ).toBeInTheDocument();
  });
});
