import { Toaster } from "@outfiqe/design-system";
import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { JobsHealthPage } from "./JobsHealthPage";

const JOBS_URL = "http://localhost:3000/api/platform/jobs";

const okJson = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const health = (overrides: Record<string, unknown> = {}) => ({
  outbox: { unpublishedCount: 4, oldestUnpublishedAt: "2026-10-04T10:00:00.000Z", stuckCount: 1 },
  stuckEvents: [
    {
      id: "event-1",
      topic: "outfit.changed",
      attempts: 10,
      lastError: "Redis connection refused",
      createdAt: "2026-10-04T09:00:00.000Z",
    },
  ],
  queues: [
    { name: "outbox-notify", isReachable: true, waiting: 2, active: 1, delayed: 0, failed: 3 },
    { name: "outbox-realtime", isReachable: false, waiting: 0, active: 0, delayed: 0, failed: 0 },
  ],
  ...overrides,
});

const renderPage = () =>
  renderWithRouter(
    <>
      <JobsHealthPage />
      <Toaster />
    </>,
    { path: "/platform/jobs" },
  );

describe("JobsHealthPage", () => {
  it("shows the backlog, each queue and the stuck events", async () => {
    mswServer.use(http.get(JOBS_URL, () => okJson(health())));
    renderPage();

    expect(await screen.findByText("Redis connection refused")).toBeInTheDocument();
    expect(screen.getByText("Can't be reached")).toBeInTheDocument();
    expect(screen.getByText(/2 waiting · 1 running · 0 delayed · 3 failed/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /queue dashboard/i })).not.toBeInTheDocument();
  });

  it("sends a stuck event again and retries a queue's failed jobs", async () => {
    const calledPaths: string[] = [];
    mswServer.use(
      http.get(JOBS_URL, () => okJson(health())),
      http.post(`${JOBS_URL}/outbox/event-1/retry`, ({ request }) => {
        calledPaths.push(new URL(request.url).pathname);
        return okJson(null);
      }),
      http.post(`${JOBS_URL}/queues/outbox-notify/retry-failed`, ({ request }) => {
        calledPaths.push(new URL(request.url).pathname);
        return okJson({ retriedCount: 3 });
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Send again" }));
    await user.click(screen.getByRole("button", { name: "Retry failed jobs" }));

    await waitFor(() =>
      expect(calledPaths).toEqual([
        "/api/platform/jobs/outbox/event-1/retry",
        "/api/platform/jobs/queues/outbox-notify/retry-failed",
      ]),
    );
    expect(await screen.findByText("Sent 3 failed jobs again.")).toBeInTheDocument();
  });

  it("says so when nothing is stuck or waiting", async () => {
    mswServer.use(
      http.get(JOBS_URL, () =>
        okJson(
          health({
            outbox: { unpublishedCount: 0, oldestUnpublishedAt: null, stuckCount: 0 },
            stuckEvents: [],
          }),
        ),
      ),
    );
    renderPage();

    expect(await screen.findByText("No events are stuck.")).toBeInTheDocument();
    expect(screen.getByText("Nothing waiting")).toBeInTheDocument();
  });
});
