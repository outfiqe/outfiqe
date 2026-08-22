import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import type { CreatorLookEditDetail } from "../api/creatorLooksSchemas";
import { EditPostModal } from "./EditPostModal";

vi.mock("./EditPostForm", () => ({
  EditPostForm: ({ lookId, detail }: { lookId: string; detail: CreatorLookEditDetail }) => (
    <div>
      Editing {lookId} with {detail.imageUrls.length} photo(s)
    </div>
  ),
}));

const renderModal = (lookId: string | null, onClose = vi.fn()) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EditPostModal lookId={lookId} onClose={onClose} />
    </QueryClientProvider>,
  );
};

describe("EditPostModal", () => {
  it("renders nothing when lookId is null", () => {
    const { container } = renderModal(null);

    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });

  it("shows a loading skeleton before the look detail arrives", () => {
    mswServer.use(
      http.get("/api/creator-looks/look-1", async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return HttpResponse.json({
          success: true,
          message: "Post detail.",
          data: { id: "look-1", imageUrls: [], caption: null, taggedProducts: [] },
        });
      }),
    );

    renderModal("look-1");

    expect(screen.getByRole("dialog", { name: "Edit post" })).toBeInTheDocument();
    expect(screen.queryByText(/Editing look-1/)).not.toBeInTheDocument();
  });

  it("mounts the edit form once the look detail has loaded", async () => {
    mswServer.use(
      http.get("/api/creator-looks/look-1", () =>
        HttpResponse.json({
          success: true,
          message: "Post detail.",
          data: {
            id: "look-1",
            imageUrls: ["https://cdn.outfiqe.test/a.jpg"],
            caption: "Nice fit",
            taggedProducts: [],
          },
        }),
      ),
    );

    renderModal("look-1");

    expect(await screen.findByText("Editing look-1 with 1 photo(s)")).toBeInTheDocument();
  });

  it("shows a couldn't-load message when the fetch fails", async () => {
    mswServer.use(
      http.get("/api/creator-looks/look-1", () =>
        HttpResponse.json({ success: false, message: "Post not found." }, { status: 404 }),
      ),
    );

    renderModal("look-1");

    expect(await screen.findByText("Couldn't load this post.")).toBeInTheDocument();
  });
});
