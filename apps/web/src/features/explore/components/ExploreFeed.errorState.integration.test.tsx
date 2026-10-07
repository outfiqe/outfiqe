import { mockNextRouter } from "@test/integration/mockRouter";
import { mswServer } from "@test/integration/msw/server";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

const FEED_URL = "/api/creator-looks/feed";
const TRENDING_TAGS_URL = "/api/creator-looks/tags/trending";
const SUGGESTED_CREATORS_URL = "/api/follows/suggested-creators";
const SERVER_ERROR_STATUS = 500;
const EMPTY_FEED_TEXT = "Nothing here yet — try a different tab.";

const feedServerError = () =>
  HttpResponse.json(
    { success: false, code: "INTERNAL_ERROR", message: "Something went wrong." },
    { status: SERVER_ERROR_STATUS },
  );

const emptyFeed = () =>
  HttpResponse.json({ success: true, message: "Feed.", data: { posts: [], nextCursor: null } });

beforeEach(() => {
  window.localStorage.setItem(FOR_YOU_HINT_DISMISSED_STORAGE_KEY, "1");
  mockNextRouter();
  vi.mocked(useSearchParams).mockReturnValue(
    new URLSearchParams() as ReturnType<typeof useSearchParams>,
  );
  mswServer.use(
    http.get(TRENDING_TAGS_URL, () =>
      HttpResponse.json({ success: true, message: "Tags.", data: { tags: [] } }),
    ),
    http.get(SUGGESTED_CREATORS_URL, () =>
      HttpResponse.json({ success: true, message: "Suggested muses.", data: { creators: [] } }),
    ),
  );
});

describe("ExploreFeed when the feed request fails", () => {
  it("shows an error with a retry button instead of the empty-feed message", async () => {
    mswServer.use(http.get(FEED_URL, feedServerError));

    render(<ExploreFeed />, { wrapper: createAuthQueryClientWrapper() });

    const feedAlert = await screen.findByRole("alert");
    expect(feedAlert).toHaveTextContent("Couldn't load the feed.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.queryByText(EMPTY_FEED_TEXT)).not.toBeInTheDocument();
  });

  it("refetches the feed when Try again is clicked", async () => {
    let feedRequestCount = 0;
    mswServer.use(
      http.get(FEED_URL, () => {
        feedRequestCount += 1;
        return feedRequestCount === 1 ? feedServerError() : emptyFeed();
      }),
    );
    const user = userEvent.setup();

    render(<ExploreFeed />, { wrapper: createAuthQueryClientWrapper() });

    await user.click(await screen.findByRole("button", { name: "Try again" }));

    expect(await screen.findByText(EMPTY_FEED_TEXT)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
