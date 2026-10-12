import { Toaster } from "@outfiqe/design-system";
import { mswServer } from "@test/integration/msw/server";
import { createTranslatedQueryWrapper } from "@test/integration/translationsWrapper";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth";

import { MyMeasurementsSettings } from "./MyMeasurementsSettings";

vi.mock("@/features/auth", () => ({ useAuth: vi.fn() }));

const MY_FIT_PROFILE_URL = "/api/fit-profile/me";
const SERVER_ERROR_STATUS = 500;

const ok = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const renderSettings = () => {
  const { Wrapper } = createTranslatedQueryWrapper();
  return render(
    <>
      <MyMeasurementsSettings />
      <Toaster />
    </>,
    { wrapper: Wrapper },
  );
};

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>);
});

afterEach(() => {
  window.localStorage.clear();
});

describe("MyMeasurementsSettings", () => {
  it("explains why sizes moved to measurements and starts empty", async () => {
    mswServer.use(http.get(MY_FIT_PROFILE_URL, () => ok(null)));
    renderSettings();

    expect(screen.getByText(/Sizes now differ from brand to brand/)).toBeInTheDocument();
    expect(await screen.findByLabelText("Height (cm)")).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
  });

  it("saves the measurements to the account and this device", async () => {
    let savedBody: unknown;
    mswServer.use(
      http.get(MY_FIT_PROFILE_URL, () => ok(null)),
      http.put(MY_FIT_PROFILE_URL, async ({ request }) => {
        savedBody = await request.json();
        return ok({ heightCm: 165, weightKg: 60 });
      }),
    );
    renderSettings();

    await userEvent.type(await screen.findByLabelText("Height (cm)"), "165");
    await userEvent.type(screen.getByLabelText("Weight (kg)"), "60");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(savedBody).toEqual({ heightCm: 165, weightKg: 60 }));
    expect(await screen.findByText("Measurements saved.")).toBeInTheDocument();
    expect(window.localStorage.getItem("outfiqe.fit-measurements")).toBe(
      JSON.stringify({ heightCm: 165, weightKg: 60 }),
    );
  });

  it("refuses measurements outside the bounds without calling the server", async () => {
    let wasSaveCalled = false;
    mswServer.use(
      http.get(MY_FIT_PROFILE_URL, () => ok(null)),
      http.put(MY_FIT_PROFILE_URL, () => {
        wasSaveCalled = true;
        return ok(null);
      }),
    );
    renderSettings();

    await userEvent.type(await screen.findByLabelText("Height (cm)"), "400");
    await userEvent.type(screen.getByLabelText("Weight (kg)"), "60");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Enter a height from 50 to 230 cm");
    expect(wasSaveCalled).toBe(false);
  });

  it("prefills saved measurements and removes them", async () => {
    let wasRemoved = false;
    mswServer.use(
      http.get(MY_FIT_PROFILE_URL, () =>
        wasRemoved ? ok(null) : ok({ heightCm: 172, weightKg: 68 }),
      ),
      http.delete(MY_FIT_PROFILE_URL, () => {
        wasRemoved = true;
        return ok(null);
      }),
    );
    renderSettings();

    expect(await screen.findByDisplayValue("172")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(await screen.findByText("Measurements removed.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Height (cm)")).toHaveValue(""));
  });

  it("offers a retry when the measurements can't load", async () => {
    mswServer.use(
      http.get(MY_FIT_PROFILE_URL, () =>
        HttpResponse.json({ success: false, message: "down" }, { status: SERVER_ERROR_STATUS }),
      ),
    );
    renderSettings();

    expect(await screen.findByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
