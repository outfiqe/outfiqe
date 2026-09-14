import { mockNextRouter } from "@test/integration/mockRouter";
import { mswServer } from "@test/integration/msw/server";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useSearchParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAuthQueryClientWrapper } from "@/features/auth/context/authTestWrapper";

import { FOR_YOU_HINT_DISMISSED_STORAGE_KEY } from "../utils/forYouHint";
import { ExploreFeed } from "./ExploreFeed";

vi.mock("@/shared/lib/socketClient", () => ({
  acquireSocketConnection: () => ({ on: vi.fn(), off: vi.fn(), emit: vi.fn() }),
  getSocket: () => ({ on: vi.fn(), off: vi.fn(), emit: vi.fn() }),
  releaseSocketConnection: vi.fn(),
}));

const FEED_URL = "/api/creator-looks/feed";
const TRENDING_TAGS_URL = "/api/creator-looks/tags/trending";
const SUGGESTED_CREATORS_URL = "/api/follows/suggested-creators";

const HINT_TEXT =
  "For You gets more personalized as you follow creators and like or save looks you love.";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

beforeEach(() => {
  window.localStorage.clear();
  mockNextRouter();
  vi.mocked(useSearchParams).mockReturnValue(
    new URLSearchParams() as ReturnType<typeof useSearchParams>,
  );
  mswServer.use(
    http.get(FEED_URL, () =>
      HttpResponse.json({ success: true, message: "Feed.", data: { posts: [], nextCursor: null } }),
    ),
    http.get(TRENDING_TAGS_URL, () =>
      HttpResponse.json({ success: true, message: "Tags.", data: { tags: [] } }),
    ),
    http.get(SUGGESTED_CREATORS_URL, () =>
      HttpResponse.json({ success: true, message: "Suggested creators.", data: { creators: [] } }),
    ),
  );
});

describe("ExploreFeed for_you personalization hint", () => {
  it("shows the hint with a dismiss control on the for_you tab", async () => {
    render(<ExploreFeed />, { wrapper: createAuthQueryClientWrapper() });

    expect(await screen.findByText(HINT_TEXT)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("hides the hint and remembers the dismissal once the user dismisses it", async () => {
    render(<ExploreFeed />, { wrapper: createAuthQueryClientWrapper() });

    await screen.findByText(HINT_TEXT);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    await waitFor(() => expect(screen.queryByText(HINT_TEXT)).not.toBeInTheDocument());
    expect(window.localStorage.getItem(FOR_YOU_HINT_DISMISSED_STORAGE_KEY)).toBe("1");
  });

  it("never shows the hint again once it was dismissed on a previous visit", async () => {
    window.localStorage.setItem(FOR_YOU_HINT_DISMISSED_STORAGE_KEY, "1");

    render(<ExploreFeed />, { wrapper: createAuthQueryClientWrapper() });

    expect(await screen.findByText("Nothing here yet — try a different tab.")).toBeInTheDocument();
    expect(screen.queryByText(HINT_TEXT)).not.toBeInTheDocument();
  });
});
