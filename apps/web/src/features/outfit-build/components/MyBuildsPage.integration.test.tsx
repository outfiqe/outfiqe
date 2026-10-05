import { mockNextRouter } from "@test/integration/mockRouter";
import { mswServer } from "@test/integration/msw/server";
import { createTranslatedQueryWrapper } from "@test/integration/translationsWrapper";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildBoard, buildSummary } from "../testing/outfitFixtures";
import { MyBuildsPage } from "./MyBuildsPage";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

beforeEach(() => window.history.replaceState(null, "", "/builds"));

const ok = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const serveLists = (mine: unknown[], shared: unknown[]) =>
  mswServer.use(
    http.get("/api/outfits", () => ok({ items: mine, nextCursor: null })),
    http.get("/api/outfits/shared-with-me", () => ok({ items: shared, nextCursor: null })),
  );

const renderPage = () => {
  const { Wrapper } = createTranslatedQueryWrapper();
  return render(<MyBuildsPage />, { wrapper: Wrapper });
};

describe("MyBuildsPage", () => {
  it("lists my builds with a link to each", async () => {
    serveLists([buildSummary({ title: "Wedding look", itemCount: 3 })], []);

    renderPage();

    const card = await screen.findByRole("link", { name: /Wedding look/ });
    expect(card).toHaveAttribute("href", "/builds/outfit-1");
    expect(screen.getByText("2 people")).toBeInTheDocument();
  });

  it("explains an empty list on both tabs", async () => {
    serveLists([], []);
    renderPage();
    const user = userEvent.setup();

    expect(await screen.findByText(/No builds yet/)).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Shared with me" }));
    expect(await screen.findByText("Nobody has shared a build with you yet.")).toBeInTheDocument();
    expect(window.location.search).toBe("?tab=shared");
  });

  it("opens the tab named in the link", async () => {
    window.history.replaceState(null, "", "/builds?tab=shared");
    serveLists([], [buildSummary({ title: "Ram's wedding look" })]);

    renderPage();

    expect(await screen.findByRole("link", { name: /Ram's wedding look/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Shared with me" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("starts a new build and opens it", async () => {
    serveLists([], []);
    mswServer.use(http.post("/api/outfits", () => ok(buildBoard({ id: "outfit-new" }))));
    const { push } = mockNextRouter();
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "New build" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/builds/outfit-new"));
  });

  it("says builds are coming soon while the feature is switched off", async () => {
    mswServer.use(
      http.get("/api/outfits", () =>
        HttpResponse.json(
          { success: false, message: "Not found.", code: "FEATURE_NOT_AVAILABLE" },
          { status: 404 },
        ),
      ),
      http.get("/api/outfits/shared-with-me", () => ok({ items: [], nextCursor: null })),
    );

    renderPage();

    expect(await screen.findByText("Outfit builds are coming soon.")).toBeInTheDocument();
  });
});
