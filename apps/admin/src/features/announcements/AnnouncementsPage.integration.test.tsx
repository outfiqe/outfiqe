import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { AnnouncementsPage } from "@/features/announcements/AnnouncementsPage";

const API_BASE = "http://localhost:3000/api";

const buildAnnouncement = (overrides: Record<string, unknown> = {}) => ({
  id: "announcement-1",
  title: "Livestream tomorrow",
  body: "Join us at 6pm for a live drop.",
  audiences: ["CUSTOMERS"],
  targetSurface: null,
  targetPath: null,
  expiresAt: null,
  scheduledAt: null,
  sentAt: null,
  status: "DRAFT",
  recipientCount: null,
  createdByAdminId: "admin-1",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  resolvedAudienceCount: 42,
  ...overrides,
});

const renderPage = (initialEntry?: string) =>
  renderWithRouter(<AnnouncementsPage />, { path: "/announcements", initialEntry });

describe("AnnouncementsPage", () => {
  it("shows a draft's title, audience, and resolved recipient estimate", async () => {
    mswServer.use(
      http.get(`${API_BASE}/admin/announcements`, () =>
        HttpResponse.json({
          success: true,
          message: "ok",
          data: { announcements: [buildAnnouncement()], nextCursor: null },
        }),
      ),
    );

    renderPage();

    expect(await screen.findByText("Livestream tomorrow")).toBeInTheDocument();
    expect(screen.getByText(/~42 people/)).toBeInTheDocument();
  });

  it("loads the next page of announcements on demand", async () => {
    mswServer.use(
      http.get(`${API_BASE}/admin/announcements`, ({ request }) => {
        const cursor = new URL(request.url).searchParams.get("cursor");
        if (cursor === "announcement-1") {
          return HttpResponse.json({
            success: true,
            message: "ok",
            data: {
              announcements: [buildAnnouncement({ id: "announcement-2", title: "Older draft" })],
              nextCursor: null,
            },
          });
        }
        return HttpResponse.json({
          success: true,
          message: "ok",
          data: { announcements: [buildAnnouncement()], nextCursor: "announcement-1" },
        });
      }),
    );

    renderPage();
    await screen.findByText("Livestream tomorrow");

    await userEvent.click(await screen.findByRole("button", { name: "Load more" }));

    expect(await screen.findByText("Older draft")).toBeInTheDocument();
  });

  it("switches tabs to request a different status", async () => {
    mswServer.use(
      http.get(`${API_BASE}/admin/announcements`, ({ request }) => {
        const status = new URL(request.url).searchParams.get("status");
        return HttpResponse.json({
          success: true,
          message: "ok",
          data: {
            announcements:
              status === "SENT"
                ? [
                    buildAnnouncement({
                      id: "announcement-2",
                      title: "Already sent",
                      status: "SENT",
                    }),
                  ]
                : [buildAnnouncement()],
            nextCursor: null,
          },
        });
      }),
    );

    renderPage();
    await screen.findByText("Livestream tomorrow");

    await userEvent.click(screen.getByRole("button", { name: "SENT" }));

    expect(await screen.findByText("Already sent")).toBeInTheDocument();
  });

  it("drafts a new announcement", async () => {
    mswServer.use(
      http.get(`${API_BASE}/admin/announcements`, () =>
        HttpResponse.json({
          success: true,
          message: "ok",
          data: { announcements: [], nextCursor: null },
        }),
      ),
      http.post(`${API_BASE}/admin/announcements`, async ({ request }) => {
        const body = (await request.json()) as { title: string; audiences: string[] };
        expect(body.title).toBe("Spring sale");
        expect(body.audiences).toEqual(["CUSTOMERS"]);
        return HttpResponse.json(
          { success: true, message: "ok", data: buildAnnouncement({ title: "Spring sale" }) },
          { status: 201 },
        );
      }),
    );

    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "New announcement" }));

    await userEvent.type(screen.getByLabelText("Title"), "Spring sale");
    await userEvent.type(screen.getByLabelText("Body"), "20% off everything this weekend.");
    await userEvent.selectOptions(screen.getByLabelText("Audience"), "CUSTOMERS");

    await userEvent.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: /new announcement/i })).not.toBeInTheDocument(),
    );
  });

  it("edits a draft, adding an internal call-to-action and an expiry", async () => {
    mswServer.use(
      http.get(`${API_BASE}/admin/announcements`, () =>
        HttpResponse.json({
          success: true,
          message: "ok",
          data: { announcements: [buildAnnouncement()], nextCursor: null },
        }),
      ),
      http.patch(`${API_BASE}/admin/announcements/announcement-1`, async ({ request }) => {
        const body = (await request.json()) as {
          targetSurface: string | null;
          targetPath: string | null;
          expiresAt: string | null;
        };
        expect(body.targetSurface).toBe("WEB");
        expect(body.targetPath).toBe("/events/spring-drop");
        expect(body.expiresAt).not.toBeNull();
        return HttpResponse.json({
          success: true,
          message: "ok",
          data: buildAnnouncement({ targetSurface: "WEB", targetPath: "/events/spring-drop" }),
        });
      }),
    );

    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));

    await userEvent.selectOptions(screen.getByLabelText("Call to action"), "internal");
    await userEvent.type(screen.getByLabelText("Path"), "/events/spring-drop");
    await userEvent.type(screen.getByLabelText("Expires on (optional)"), "2026-12-01");

    await userEvent.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: /edit draft/i })).not.toBeInTheDocument(),
    );
  });

  it("sets an external link call-to-action", async () => {
    mswServer.use(
      http.get(`${API_BASE}/admin/announcements`, () =>
        HttpResponse.json({
          success: true,
          message: "ok",
          data: { announcements: [buildAnnouncement()], nextCursor: null },
        }),
      ),
      http.patch(`${API_BASE}/admin/announcements/announcement-1`, async ({ request }) => {
        const body = (await request.json()) as {
          targetSurface: string | null;
          targetPath: string | null;
        };
        expect(body.targetSurface).toBeNull();
        expect(body.targetPath).toBe("https://forms.gle/survey");
        return HttpResponse.json({
          success: true,
          message: "ok",
          data: buildAnnouncement({ targetSurface: null, targetPath: "https://forms.gle/survey" }),
        });
      }),
    );

    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));

    await userEvent.selectOptions(screen.getByLabelText("Call to action"), "external");
    await userEvent.type(screen.getByLabelText("Link"), "https://forms.gle/survey");

    await userEvent.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: /edit draft/i })).not.toBeInTheDocument(),
    );
  });

  it("sends a draft immediately", async () => {
    mswServer.use(
      http.get(`${API_BASE}/admin/announcements`, () =>
        HttpResponse.json({
          success: true,
          message: "ok",
          data: {
            announcements: [buildAnnouncement({ resolvedAudienceCount: 3 })],
            nextCursor: null,
          },
        }),
      ),
      http.post(`${API_BASE}/admin/announcements/announcement-1/send`, () =>
        HttpResponse.json({
          success: true,
          message: "ok",
          data: buildAnnouncement({ status: "SENT", recipientCount: 3, resolvedAudienceCount: 3 }),
        }),
      ),
    );

    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Send" }));

    expect(await screen.findByText(/This will reach approximately 3 people/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Send now" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: /send — livestream tomorrow/i }),
      ).not.toBeInTheDocument(),
    );
  });

  it("schedules a send for a chosen time instead of sending now", async () => {
    mswServer.use(
      http.get(`${API_BASE}/admin/announcements`, () =>
        HttpResponse.json({
          success: true,
          message: "ok",
          data: {
            announcements: [buildAnnouncement({ resolvedAudienceCount: 3 })],
            nextCursor: null,
          },
        }),
      ),
      http.post(`${API_BASE}/admin/announcements/announcement-1/send`, async ({ request }) => {
        const body = (await request.json()) as { scheduledAt?: string };
        expect(typeof body.scheduledAt).toBe("string");
        return HttpResponse.json({
          success: true,
          message: "ok",
          data: buildAnnouncement({ status: "SCHEDULED", scheduledAt: body.scheduledAt ?? null }),
        });
      }),
    );

    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Send" }));

    await userEvent.selectOptions(screen.getByLabelText("When"), "schedule");
    await userEvent.clear(screen.getByLabelText("Send at"));
    await userEvent.type(screen.getByLabelText("Send at"), "2026-12-01T18:00");
    await userEvent.click(screen.getByRole("button", { name: "Schedule" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: /send — livestream tomorrow/i }),
      ).not.toBeInTheDocument(),
    );
  });

  it("cancels a scheduled announcement", async () => {
    let canceled = false;
    mswServer.use(
      http.get(`${API_BASE}/admin/announcements`, () =>
        HttpResponse.json({
          success: true,
          message: "ok",
          data: {
            announcements: canceled
              ? []
              : [
                  buildAnnouncement({
                    status: "SCHEDULED",
                    scheduledAt: "2026-09-20T18:00:00.000Z",
                  }),
                ],
            nextCursor: null,
          },
        }),
      ),
      http.post(`${API_BASE}/admin/announcements/announcement-1/cancel`, () => {
        canceled = true;
        return HttpResponse.json({ success: true, message: "ok", data: null });
      }),
    );

    renderPage("/announcements?status=SCHEDULED");
    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByText("Livestream tomorrow")).not.toBeInTheDocument());
  });
});
