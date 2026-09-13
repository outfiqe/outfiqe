import { QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { createTestQueryClient } from "@test/integration/queryClientWrapper";
import { render, screen, waitFor } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "@/features/auth/context/AuthContext";
import { createAuthQueryClientWrapper } from "@/features/auth/context/authTestWrapper";

import { ExploreFeed } from "./ExploreFeed";

vi.mock("@/shared/lib/socketClient", () => ({
  acquireSocketConnection: () => ({ on: vi.fn(), off: vi.fn(), emit: vi.fn() }),
  getSocket: () => ({ on: vi.fn(), off: vi.fn(), emit: vi.fn() }),
  releaseSocketConnection: vi.fn(),
}));

const SESSION_URL = "/api/auth/session";
const CURRENT_USER_URL = "/api/auth/me";
const FEED_URL = "/api/creator-looks/feed";
const TRENDING_TAGS_URL = "/api/creator-looks/tags/trending";
const SUGGESTED_CREATORS_URL = "/api/follows/suggested-creators";

const currentUser = {
  id: "user-1",
  name: "Ava Martinez",
  email: "ava@outfiqe.test",
  phone: null,
  avatarUrl: null,
  role: "CUSTOMER",
  isCreator: false,
  creatorStatus: "NONE",
  hasPassword: true,
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const setHasSessionCookie = () => {
  document.cookie = "has_session=1";
};

afterEach(() => {
  document.cookie = "has_session=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
});

const mockAncillaryFeedEndpoints = () => {
  mswServer.use(
    http.get(TRENDING_TAGS_URL, () =>
      HttpResponse.json({ success: true, message: "Tags.", data: { tags: [] } }),
    ),
    http.get(SUGGESTED_CREATORS_URL, () =>
      HttpResponse.json({ success: true, message: "Suggested creators.", data: { creators: [] } }),
    ),
  );
};

describe("ExploreFeed auth-resolution timing", () => {
  it("waits for the session check to resolve before requesting the for_you feed, so the request is never sent anonymously", async () => {
    setHasSessionCookie();
    mockAncillaryFeedEndpoints();

    const feedAuthorizationHeaders: (string | null)[] = [];
    mswServer.use(
      http.post(SESSION_URL, async () => {
        await delay(50);
        return HttpResponse.json({
          success: true,
          message: "Session is valid.",
          data: { accessToken: "access-token" },
        });
      }),
      http.get(CURRENT_USER_URL, () =>
        HttpResponse.json({ success: true, message: "Current user.", data: currentUser }),
      ),
      http.get(FEED_URL, ({ request }) => {
        feedAuthorizationHeaders.push(request.headers.get("Authorization"));
        return HttpResponse.json({
          success: true,
          message: "Feed.",
          data: { posts: [], nextCursor: null },
        });
      }),
    );

    render(<ExploreFeed />, { wrapper: createAuthQueryClientWrapper() });

    await waitFor(() => expect(feedAuthorizationHeaders.length).toBeGreaterThan(0));

    expect(feedAuthorizationHeaders[0]).toBe("Bearer access-token");
  });

  it("still loads the for_you feed for a genuinely signed-out visitor, with no session cookie at all", async () => {
    mockAncillaryFeedEndpoints();

    const feedAuthorizationHeaders: (string | null)[] = [];
    const checkSession = vi.fn(() => new HttpResponse(null, { status: 500 }));
    mswServer.use(
      http.post(SESSION_URL, checkSession),
      http.get(FEED_URL, ({ request }) => {
        feedAuthorizationHeaders.push(request.headers.get("Authorization"));
        return HttpResponse.json({
          success: true,
          message: "Feed.",
          data: { posts: [], nextCursor: null },
        });
      }),
    );

    render(<ExploreFeed />, { wrapper: createAuthQueryClientWrapper() });

    await waitFor(() => expect(feedAuthorizationHeaders.length).toBeGreaterThan(0));

    expect(checkSession).not.toHaveBeenCalled();
    expect(feedAuthorizationHeaders[0]).toBeNull();
    expect(await screen.findByText("Nothing here yet — try a different tab.")).toBeInTheDocument();
  });

  it("never reuses a signed-out visitor's cached feed for a signed-in viewer", async () => {
    setHasSessionCookie();
    mockAncillaryFeedEndpoints();

    const feedAuthorizationHeaders: (string | null)[] = [];
    mswServer.use(
      http.post(SESSION_URL, () =>
        HttpResponse.json({
          success: true,
          message: "Session is valid.",
          data: { accessToken: "access-token" },
        }),
      ),
      http.get(CURRENT_USER_URL, () =>
        HttpResponse.json({ success: true, message: "Current user.", data: currentUser }),
      ),
      http.get(FEED_URL, ({ request }) => {
        feedAuthorizationHeaders.push(request.headers.get("Authorization"));
        return HttpResponse.json({
          success: true,
          message: "Feed.",
          data: { posts: [], nextCursor: null },
        });
      }),
    );

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(["explore-feed", "for_you", "anonymous"], {
      pages: [{ posts: [], nextCursor: null }],
      pageParams: [undefined],
    });

    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );

    render(<ExploreFeed />, { wrapper: Wrapper });

    await waitFor(() => expect(feedAuthorizationHeaders.length).toBeGreaterThan(0));

    expect(feedAuthorizationHeaders[0]).toBe("Bearer access-token");
    expect(queryClient.getQueryData(["explore-feed", "for_you", "anonymous"])).toEqual({
      pages: [{ posts: [], nextCursor: null }],
      pageParams: [undefined],
    });
  });
});
