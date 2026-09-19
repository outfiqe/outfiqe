import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { ContentBrowserPage } from "@/features/content-browser/ContentBrowserPage";
import type { AdminLook, LookComment, LookCommentReply } from "@/features/content-browser/schemas";

const API_BASE = "http://localhost:3000/api";

const aLook = (overrides: Partial<AdminLook> = {}): AdminLook => ({
  id: "look-1",
  imageUrl: "https://cdn.test/look-1.jpg",
  layout: "PORTRAIT",
  caption: "Denim jacket fit",
  creator: { id: "creator-1", name: "Asha Rai", handle: "asharai", contentFlagCount: 2 },
  likeCount: 12,
  commentCount: 1,
  saveCount: 3,
  createdAt: "2026-09-08T00:00:00.000Z",
  ...overrides,
});

const aComment = (overrides: Partial<LookComment> = {}): LookComment => ({
  id: "comment-1",
  userId: "user-1",
  userName: "Bo Chen",
  userHandle: "bochen",
  userAvatarUrl: null,
  body: "Buy followers at cheapfollowers.test",
  createdAt: "2026-09-08T01:00:00.000Z",
  replyCount: 0,
  previewReplies: [],
  ...overrides,
});

const aReply = (overrides: Partial<LookCommentReply> = {}): LookCommentReply => ({
  id: "reply-1",
  parentCommentId: "comment-1",
  userId: "user-2",
  userName: "Cy Lee",
  userHandle: "cylee",
  userAvatarUrl: null,
  body: "Reported this too",
  createdAt: "2026-09-08T02:00:00.000Z",
  ...overrides,
});

const stubLooks = (looks: AdminLook[]) => {
  mswServer.use(
    http.get(`${API_BASE}/creator-looks/admin`, () =>
      HttpResponse.json({ success: true, message: "ok", data: { items: looks, nextCursor: null } }),
    ),
  );
};

const stubComments = (lookId: string, comments: LookComment[]) => {
  mswServer.use(
    http.get(`${API_BASE}/creator-looks/${lookId}/comments`, () =>
      HttpResponse.json({
        success: true,
        message: "ok",
        data: { comments, nextCursor: null },
      }),
    ),
  );
};

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(<ContentBrowserPage />, { wrapper });
};

const openDetail = async (look: AdminLook) => {
  await userEvent.click(await screen.findByRole("button", { name: look.caption ?? "" }));
  return screen.findByRole("dialog");
};

const topmostConfirmDialog = async (): Promise<HTMLElement> => {
  const dialogs = await screen.findAllByRole("dialog");
  const topmost = dialogs.at(-1);
  if (!topmost) throw new Error("Expected a confirm dialog to be open.");
  return topmost;
};

describe("ContentBrowserPage", () => {
  it("lists a post as a grid card with its creator and caption", async () => {
    stubLooks([aLook()]);
    renderPage();

    expect(await screen.findByText("@asharai")).toBeInTheDocument();
    expect(screen.getByText("Denim jacket fit")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Denim jacket fit" })).toBeInTheDocument();
  });

  it("searches posts by the typed query", async () => {
    stubLooks([aLook()]);
    renderPage();
    await screen.findByText("@asharai");

    let requestedQuery: string | null = null;
    mswServer.use(
      http.get(`${API_BASE}/creator-looks/admin`, ({ request }) => {
        requestedQuery = new URL(request.url).searchParams.get("q");
        return HttpResponse.json({
          success: true,
          message: "ok",
          data: { items: [], nextCursor: null },
        });
      }),
    );

    await userEvent.type(screen.getByPlaceholderText(/search by caption/i), "denim");

    await waitFor(() => expect(requestedQuery).toBe("denim"));
  });

  it("opens a post's detail and shows the prior-removal count and engagement stats", async () => {
    stubLooks([aLook()]);
    renderPage();
    const dialog = await openDetail(aLook());

    expect(within(dialog).getByText("2 prior removals")).toBeInTheDocument();
    expect(within(dialog).getByText(/12 likes/)).toBeInTheDocument();
  });

  it("deletes a post after confirming from the detail view", async () => {
    stubLooks([aLook()]);
    let deleteCalled = false;
    mswServer.use(
      http.delete(`${API_BASE}/creator-looks/look-1`, () => {
        deleteCalled = true;
        return HttpResponse.json({ success: true, message: "ok", data: { deleted: true } });
      }),
    );
    renderPage();

    const dialog = await openDetail(aLook());
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete post" }));

    const confirm = await topmostConfirmDialog();
    await userEvent.click(within(confirm).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deleteCalled).toBe(true));
  });

  it("shows a post's comments in its detail view and deletes one", async () => {
    stubLooks([aLook()]);
    stubComments("look-1", [aComment()]);
    let deletedCommentId: string | null = null;
    mswServer.use(
      http.delete(`${API_BASE}/creator-looks/look-1/comments/comment-1`, () => {
        deletedCommentId = "comment-1";
        return HttpResponse.json({ success: true, message: "ok", data: { deleted: true } });
      }),
    );
    renderPage();

    const dialog = await openDetail(aLook());
    expect(
      await within(dialog).findByText(/Buy followers at cheapfollowers\.test/),
    ).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    const confirm = await topmostConfirmDialog();
    await userEvent.click(within(confirm).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deletedCommentId).toBe("comment-1"));
  });

  it("expands hidden replies for a comment and deletes one", async () => {
    stubLooks([aLook()]);
    stubComments("look-1", [
      aComment({ replyCount: 2, previewReplies: [aReply({ id: "reply-1", body: "First reply" })] }),
    ]);
    let deletedReplyId: string | null = null;
    mswServer.use(
      http.get(`${API_BASE}/creator-looks/look-1/comments/comment-1/replies`, () =>
        HttpResponse.json({
          success: true,
          message: "ok",
          data: {
            replies: [
              aReply({ id: "reply-1", body: "First reply" }),
              aReply({ id: "reply-2", body: "Second reply" }),
            ],
            nextCursor: null,
          },
        }),
      ),
      http.delete(`${API_BASE}/creator-looks/look-1/comments/reply-2`, () => {
        deletedReplyId = "reply-2";
        return HttpResponse.json({ success: true, message: "ok", data: { deleted: true } });
      }),
    );
    renderPage();

    const dialog = await openDetail(aLook());
    expect(await within(dialog).findByText("First reply")).toBeInTheDocument();
    expect(within(dialog).queryByText("Second reply")).not.toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: "View 1 more reply" }));
    expect(await within(dialog).findByText("Second reply")).toBeInTheDocument();

    const secondReplyRow = within(dialog).getByText("Second reply").closest("div")?.parentElement;
    if (!secondReplyRow) throw new Error("Expected the second reply's row to be in the document.");
    await userEvent.click(within(secondReplyRow).getByRole("button", { name: "Delete" }));

    const confirm = await topmostConfirmDialog();
    await userEvent.click(within(confirm).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deletedReplyId).toBe("reply-2"));
  });
});
