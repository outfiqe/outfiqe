import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { TagReviewTagsPage } from "@/features/tag-reviews/components/TagReviewTagsPage";
import { toMetricTagsSearch } from "@/features/tag-reviews/utils/metricTagsSearch.utils";

const METRIC_TAGS_URL = "http://localhost:3000/api/tag-reviews/metrics/tags";

const liveTag = {
  id: "tag-1",
  reviewStatus: "APPROVED",
  approvalSource: "SLA",
  rejectionReason: null,
  rejectionNote: null,
  reRequestCount: 1,
  sizeWorn: "M",
  reportCount: 2,
  submittedAt: "2026-10-01T10:00:00.000Z",
  decidedAt: "2026-10-08T10:00:00.000Z",
  reviewerName: null,
  waitHours: 168,
  hoursToGoLive: 170,
  look: {
    id: "look-1",
    imageUrl: "https://cdn.outfiqe.test/look.jpg",
    caption: "Festival fit",
    postedAt: "2026-10-01T08:00:00.000Z",
  },
  creator: { id: "creator-1", name: "Asha Rai", handle: "asha" },
  product: { id: "product-1", name: "Dhaka Topi", imageUrl: null },
  brand: { id: "brand-1", name: "Everlane", policy: "APPROVAL_REQUIRED" },
};

const mockMetricTagPages = (requestedQueries: string[] = []) => {
  mswServer.use(
    http.get(METRIC_TAGS_URL, ({ request }) => {
      const { search } = new URL(request.url);
      requestedQueries.push(search);
      const isSecondPage = search.includes("cursor=next");
      return HttpResponse.json({
        success: true,
        message: "ok",
        data: {
          items: [
            isSecondPage
              ? { ...liveTag, id: "tag-2", product: { ...liveTag.product, name: "Pashmina" } }
              : liveTag,
          ],
          nextCursor: isSecondPage ? null : "next",
          totalCount: 2,
        },
      });
    }),
  );
};

const renderPage = (initialUrl: string) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute();
  const authenticatedRoute = createRoute({ getParentRoute: () => rootRoute, id: "_authenticated" });
  const tagsRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: "tag-reviews/tags",
    validateSearch: toMetricTagsSearch,
    component: TagReviewTagsPage,
  });
  const overviewRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: "tag-reviews",
  });
  const reportsRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: "tag-reports",
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      authenticatedRoute.addChildren([tagsRoute, overviewRoute, reportsRoute]),
    ]),
    history: createMemoryHistory({ initialEntries: [initialUrl] }),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
};

describe("TagReviewTagsPage", () => {
  it("asks the API for the clicked number and shows the total", async () => {
    const requestedQueries: string[] = [];
    mockMetricTagPages(requestedQueries);
    renderPage("/tag-reviews/tags?view=LIVE&source=SLA");

    expect(await screen.findByRole("heading", { name: "Live tags" })).toBeInTheDocument();
    expect(await screen.findByText("Dhaka Topi")).toBeInTheDocument();
    expect(screen.getByText("2 tags")).toBeInTheDocument();
    expect(requestedQueries).toEqual(["?view=LIVE&source=SLA"]);
    expect(screen.getByRole("button", { name: /Only: Brand didn't reply/ })).toBeInTheDocument();
  });

  it("loads the next page on request", async () => {
    mockMetricTagPages();
    renderPage("/tag-reviews/tags?view=LIVE");

    await userEvent.click(await screen.findByRole("button", { name: "Load more" }));

    expect(await screen.findByText("Pashmina")).toBeInTheDocument();
    expect(screen.getByText("Dhaka Topi")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("opens the full story of a tag in a side panel", async () => {
    mockMetricTagPages();
    renderPage("/tag-reviews/tags?view=LIVE");

    await userEvent.click(await screen.findByRole("button", { name: /Dhaka Topi/ }));

    const panel = await screen.findByRole("dialog");
    expect(within(panel).getByText("What happened")).toBeInTheDocument();
    expect(within(panel).getByText(/didn't answer within 7 days/)).toBeInTheDocument();
    expect(within(panel).getByText("2 reports")).toBeInTheDocument();
    expect(within(panel).getByText("1 time")).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: "Asha Rai" })).toHaveAttribute(
      "href",
      expect.stringContaining("/creator/asha"),
    );
    expect(within(panel).getByRole("link", { name: /Open this look/ })).toHaveAttribute(
      "href",
      expect.stringContaining("/creator/asha?look=look-1"),
    );
  });

  it("switches view and drops the narrowing from the earlier view", async () => {
    mockMetricTagPages();
    const router = renderPage("/tag-reviews/tags?view=LIVE&source=SLA");

    await userEvent.click(await screen.findByRole("button", { name: "Waiting" }));

    await waitFor(() => expect(router.state.location.search).toEqual({ view: "WAITING" }));
    expect(await screen.findByRole("heading", { name: "Waiting for a brand" })).toBeInTheDocument();
  });

  it("falls back to live tags for a view it does not know", async () => {
    mockMetricTagPages();
    renderPage("/tag-reviews/tags?view=NOPE");

    expect(await screen.findByRole("heading", { name: "Live tags" })).toBeInTheDocument();
  });

  it("says so when a view is empty", async () => {
    mswServer.use(
      http.get(METRIC_TAGS_URL, () =>
        HttpResponse.json({
          success: true,
          message: "ok",
          data: { items: [], nextCursor: null, totalCount: 0 },
        }),
      ),
    );
    renderPage("/tag-reviews/tags?view=STUCK");

    expect(await screen.findByText("Nothing is stuck.")).toBeInTheDocument();
    expect(screen.getByText("0 tags")).toBeInTheDocument();
  });

  it("shows an error state when the request fails", async () => {
    mswServer.use(
      http.get(METRIC_TAGS_URL, () =>
        HttpResponse.json({ success: false, message: "nope" }, { status: 500 }),
      ),
    );
    renderPage("/tag-reviews/tags?view=LIVE");

    expect(await screen.findByText(/Couldn't load these tags/)).toBeInTheDocument();
  });
});
