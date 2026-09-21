import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth";

import type { TagReviewQueueItem } from "../api/tagReviewSchemas";
import { TagReviewsSection } from "./TagReviewsSection";

vi.mock("@/features/auth", () => ({ useAuth: vi.fn() }));

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const anItem = (overrides: Partial<TagReviewQueueItem> = {}): TagReviewQueueItem => ({
  id: "tag-1",
  lookId: "look-1",
  lookImageUrl: "https://cdn.test/look-1.jpg",
  submittedAt: "2026-09-06T00:00:00.000Z",
  reviewedAt: null,
  reviewStatus: "PENDING",
  approvalSource: null,
  rejectionReason: null,
  rejectionNote: null,
  reRequestCount: 0,
  sizeWorn: "M",
  isVerifiedBuyer: false,
  isTrustedCreator: false,
  creator: { id: "creator-1", name: "Asha Rai", handle: "asharai" },
  product: { id: "product-1", name: "Linen Shirt", imageUrl: null, brandId: "brand-1" },
  ...overrides,
});

const queueResponse = (items: TagReviewQueueItem[]) =>
  HttpResponse.json({ success: true, message: "ok", data: { items, nextCursor: null } });

const stubQueue = (
  byStatus: Partial<Record<string, TagReviewQueueItem[]>>,
  pendingCount = byStatus.PENDING?.length ?? 0,
) => {
  mswServer.use(
    http.get("/api/tag-reviews/pending-count", () =>
      HttpResponse.json({ success: true, message: "ok", data: { pendingCount } }),
    ),
    http.get("/api/tag-reviews", ({ request }) => {
      const status = new URL(request.url).searchParams.get("status") ?? "PENDING";
      return queueResponse(byStatus[status] ?? []);
    }),
  );
};

let currentSearchParams = new URLSearchParams();
let replaceStateSpy: ReturnType<typeof vi.spyOn>;

const renderSection = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
  const utils = render(<TagReviewsSection />, { wrapper });
  const clickTab = async (name: string) => {
    await userEvent.click(await screen.findByRole("tab", { name }));
  };
  return { ...utils, clickTab };
};

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated: true,
    state: { user: { role: "BRAND_OWNER" } },
  } as ReturnType<typeof useAuth>);

  currentSearchParams = new URLSearchParams();
  vi.mocked(useSearchParams).mockImplementation(
    () => currentSearchParams as ReturnType<typeof useSearchParams>,
  );
  replaceStateSpy = vi.spyOn(window.history, "replaceState");
});

afterEach(() => {
  replaceStateSpy.mockRestore();
});

describe("TagReviewsSection", () => {
  it("shows the empty state when nothing is waiting", async () => {
    stubQueue({ PENDING: [] });
    renderSection();

    expect(await screen.findByText(/no tags waiting for review/i)).toBeInTheDocument();
  });

  it("lists waiting tags with the verified-buyer signal and the pending count", async () => {
    stubQueue({ PENDING: [anItem({ isVerifiedBuyer: true })] }, 1);
    renderSection();

    expect(await screen.findByText("Asha Rai")).toBeInTheDocument();
    expect(screen.getByText(/Linen Shirt/)).toBeInTheDocument();
    expect(screen.getByText("Bought this on Outfiqe")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Waiting \(1\)/ })).toBeInTheDocument();
  });

  it("approves a tag and trusts the creator through the API", async () => {
    let approveBody: unknown;
    stubQueue({ PENDING: [anItem()] }, 1);
    mswServer.use(
      http.post("/api/tag-reviews/tag-1/approve", async ({ request }) => {
        approveBody = await request.json();
        return HttpResponse.json({ success: true, message: "ok", data: null });
      }),
    );
    renderSection();

    await screen.findByText("Asha Rai");
    await userEvent.click(screen.getByRole("button", { name: "Approve & trust" }));

    await waitFor(() => expect(approveBody).toEqual({ trustCreator: true }));
    expect(await screen.findByText(/is now trusted/i)).toBeInTheDocument();
  });

  it("declines a tag with a reason and a note", async () => {
    let rejectBody: unknown;
    stubQueue({ PENDING: [anItem()] }, 1);
    mswServer.use(
      http.post("/api/tag-reviews/tag-1/reject", async ({ request }) => {
        rejectBody = await request.json();
        return HttpResponse.json({ success: true, message: "ok", data: null });
      }),
    );
    renderSection();

    await screen.findByText("Asha Rai");
    await userEvent.click(screen.getByRole("button", { name: "Decline" }));

    const dialog = await screen.findByRole("dialog");
    await userEvent.selectOptions(within(dialog).getByLabelText("Reason"), "MISREPRESENTS_PRODUCT");
    await userEvent.type(
      within(dialog).getByLabelText(/Note to the creator/),
      "Different colourway than ours.",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Decline tag" }));

    await waitFor(() =>
      expect(rejectBody).toEqual({
        reason: "MISREPRESENTS_PRODUCT",
        note: "Different colourway than ours.",
      }),
    );
  });

  it("blocks an OTHER decline with no note", async () => {
    stubQueue({ PENDING: [anItem()] }, 1);
    renderSection();

    await screen.findByText("Asha Rai");
    await userEvent.click(screen.getByRole("button", { name: "Decline" }));

    const dialog = await screen.findByRole("dialog");
    await userEvent.selectOptions(within(dialog).getByLabelText("Reason"), "OTHER");
    await userEvent.click(within(dialog).getByRole("button", { name: "Decline tag" }));

    expect(within(dialog).getByText(/Add a note explaining why/)).toBeInTheDocument();
  });

  it("shows why an approved tag went live and lets the brand remove it", async () => {
    let rejectBody: unknown;
    stubQueue({
      APPROVED: [
        anItem({
          id: "tag-live",
          reviewStatus: "APPROVED",
          approvalSource: "VERIFIED_BUYER",
        }),
      ],
    });
    mswServer.use(
      http.post("/api/tag-reviews/tag-live/reject", async ({ request }) => {
        rejectBody = await request.json();
        return HttpResponse.json({ success: true, message: "ok", data: null });
      }),
    );
    const { clickTab } = renderSection();

    await clickTab("Approved");

    expect(replaceStateSpy).toHaveBeenCalledWith(window.history.state, "", "?status=APPROVED");
    expect(await screen.findByText(/bought on outfiqe/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove tag" }));

    const dialog = await screen.findByRole("dialog", { name: /Remove this tag/i });
    await userEvent.selectOptions(within(dialog).getByLabelText("Reason"), "COUNTERFEIT_SUSPECTED");
    await userEvent.click(within(dialog).getByRole("button", { name: "Remove tag" }));

    await waitFor(() => expect(rejectBody).toEqual({ reason: "COUNTERFEIT_SUSPECTED" }));
  });

  it("shows the brand's own note on a declined tag", async () => {
    stubQueue({
      REJECTED: [
        anItem({
          id: "tag-declined",
          reviewStatus: "REJECTED",
          rejectionReason: "NOT_OUR_PRODUCT",
          rejectionNote: "This is a reseller listing.",
        }),
      ],
    });
    const { clickTab } = renderSection();

    await clickTab("Declined");

    expect(await screen.findByText(/This is a reseller listing\./)).toBeInTheDocument();
  });

  it("opens directly on the tab named in the URL, so a shared or reloaded link lands correctly", async () => {
    currentSearchParams = new URLSearchParams({ status: "REJECTED" });
    stubQueue({
      REJECTED: [anItem({ id: "tag-declined", reviewStatus: "REJECTED" })],
    });
    renderSection();

    expect(
      await screen.findByRole("tab", { name: "Declined", selected: true }),
    ).toBeInTheDocument();
  });

  it("highlights the clicked tab immediately and shows a skeleton while that tab's first load is in flight", async () => {
    mswServer.use(
      http.get("/api/tag-reviews/pending-count", () =>
        HttpResponse.json({ success: true, message: "ok", data: { pendingCount: 0 } }),
      ),
      http.get("/api/tag-reviews", async ({ request }) => {
        const status = new URL(request.url).searchParams.get("status");
        if (status !== "PENDING") await delay(200);
        return queueResponse([]);
      }),
    );
    const { clickTab } = renderSection();
    await screen.findByText(/no tags waiting for review/i);

    await clickTab("Declined");

    expect(screen.getByRole("tab", { name: "Declined", selected: true })).toBeInTheDocument();
    expect(await screen.findByRole("status", { name: "Loading tags" })).toBeInTheDocument();
    expect(await screen.findByText(/haven't declined any creator tags/i)).toBeInTheDocument();
  });

  it("preloads the other tabs after the first one loads, so switching shows data with no skeleton", async () => {
    const requestedStatuses: string[] = [];
    mswServer.use(
      http.get("/api/tag-reviews/pending-count", () =>
        HttpResponse.json({ success: true, message: "ok", data: { pendingCount: 1 } }),
      ),
      http.get("/api/tag-reviews", ({ request }) => {
        const status = new URL(request.url).searchParams.get("status") ?? "PENDING";
        requestedStatuses.push(status);
        return queueResponse(
          status === "APPROVED"
            ? [anItem({ id: "tag-live", reviewStatus: "APPROVED", approvalSource: "BRAND" })]
            : [anItem()],
        );
      }),
    );
    const { clickTab } = renderSection();
    await screen.findByText("Asha Rai");
    await waitFor(() =>
      expect(requestedStatuses).toEqual(expect.arrayContaining(["APPROVED", "REJECTED"])),
    );

    await clickTab("Approved");

    expect(screen.queryByRole("status", { name: "Loading tags" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove tag" })).toBeInTheDocument();
  });

  it("switches tabs without a router navigation, keeping the status in the address bar", async () => {
    stubQueue({ PENDING: [], APPROVED: [], REJECTED: [] });
    const { clickTab } = renderSection();
    await screen.findByText(/no tags waiting for review/i);

    await clickTab("Approved");
    await clickTab("Waiting");

    expect(replaceStateSpy).toHaveBeenNthCalledWith(
      1,
      window.history.state,
      "",
      "?status=APPROVED",
    );
    expect(replaceStateSpy).toHaveBeenNthCalledWith(2, window.history.state, "", "?status=PENDING");
  });

  it("surfaces a load error with a retry", async () => {
    mswServer.use(
      http.get("/api/tag-reviews/pending-count", () =>
        HttpResponse.json({ success: true, message: "ok", data: { pendingCount: 0 } }),
      ),
      http.get("/api/tag-reviews", () =>
        HttpResponse.json({ success: false, message: "Server error." }, { status: 500 }),
      ),
    );
    renderSection();

    expect(await screen.findByText(/Couldn't load the review queue/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
