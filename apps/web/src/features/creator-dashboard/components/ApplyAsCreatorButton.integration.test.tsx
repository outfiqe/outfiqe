import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { useRouter } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplyAsCreatorButton } from "./ApplyAsCreatorButton";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

const refresh = vi.fn();

beforeEach(() => {
  vi.mocked(useRouter).mockReturnValue({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh,
    prefetch: vi.fn(),
    bfcacheId: "test-bfcache-id",
  });
  refresh.mockClear();
});

const renderButton = () => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ApplyAsCreatorButton />
    </QueryClientProvider>,
  );
};

describe("ApplyAsCreatorButton", () => {
  it("submits the application and refreshes the router on success", async () => {
    mswServer.use(
      http.post("/api/creators/apply", () =>
        HttpResponse.json({
          success: true,
          message: "Creator application submitted.",
          data: {
            userId: "user-1",
            name: "Ava Martinez",
            email: "ava@outfiqe.test",
            handle: "ava",
            avatarUrl: null,
            heightCm: null,
            showHeight: false,
            isCreator: false,
            creatorStatus: "PENDING",
          },
        }),
      ),
    );

    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: "Apply to become a creator" }));

    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  });

  it("shows the pending label while the request is in flight", async () => {
    mswServer.use(
      http.post("/api/creators/apply", async () => {
        await delay(50);
        return HttpResponse.json({
          success: true,
          message: "Creator application submitted.",
          data: {
            userId: "user-1",
            name: "Ava Martinez",
            email: "ava@outfiqe.test",
            handle: "ava",
            avatarUrl: null,
            heightCm: null,
            showHeight: false,
            isCreator: false,
            creatorStatus: "PENDING",
          },
        });
      }),
    );

    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: "Apply to become a creator" }));

    expect(await screen.findByRole("button", { name: "Applying…" })).toBeDisabled();
  });

  it("shows an error message when the application fails", async () => {
    mswServer.use(
      http.post("/api/creators/apply", () =>
        HttpResponse.json({ success: false, message: "You've already applied." }, { status: 409 }),
      ),
    );

    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: "Apply to become a creator" }));

    expect(await screen.findByText("You've already applied.")).toBeInTheDocument();
  });
});
