import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { HeroSlidesPage } from "./HeroSlidesPage";

vi.mock("@/components/ImageUpload", () => ({
  ImageUpload: () => null,
}));

const API_BASE = "http://localhost:3000/api";

const heroSlide = (id: string, title: string) => ({
  id,
  tag: "Collection 01",
  title,
  description: "A short description.",
  imageUrl: null,
  ctaLabel: "Shop now",
  ctaHref: "/collections/one",
  status: "PUBLISHED" as const,
  sortOrder: 0,
});

const okJson = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
  return render(<HeroSlidesPage />, { wrapper });
};

describe("HeroSlidesPage", () => {
  it("unpublishes a published slide", async () => {
    let patchCalled = false;
    mswServer.use(
      http.get(`${API_BASE}/hero-slides/admin`, () =>
        okJson([heroSlide("slide-1", "Dashain Edit")]),
      ),
      http.patch(`${API_BASE}/hero-slides/slide-1`, () => {
        patchCalled = true;
        return okJson({ ...heroSlide("slide-1", "Dashain Edit"), status: "DRAFT" });
      }),
    );

    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Unpublish" }));

    expect(patchCalled).toBe(true);
  });

  it("shows a success toast when a slide is unpublished", async () => {
    mswServer.use(
      http.get(`${API_BASE}/hero-slides/admin`, () =>
        okJson([heroSlide("slide-1", "Dashain Edit")]),
      ),
      http.patch(`${API_BASE}/hero-slides/slide-1`, () =>
        okJson({ ...heroSlide("slide-1", "Dashain Edit"), status: "DRAFT" }),
      ),
    );

    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Unpublish" }));

    expect(await screen.findByText("Hero slide unpublished.")).toBeInTheDocument();
  });

  it("names every missing field inline, not in a browser popup, and sends nothing", async () => {
    const createRequested = vi.fn();
    mswServer.use(
      http.get(`${API_BASE}/hero-slides/admin`, () => okJson([])),
      http.post(`${API_BASE}/hero-slides`, () => {
        createRequested();
        return okJson(heroSlide("new", "New"));
      }),
    );

    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Create slide" }));

    expect(await screen.findByText("Enter a tag.")).toBeInTheDocument();
    expect(screen.getByText("Enter a title.")).toBeInTheDocument();
    expect(screen.getByText("Enter a description.")).toBeInTheDocument();
    expect(screen.getByText("Enter a button label.")).toBeInTheDocument();
    expect(screen.getByText("Enter where the button should link to.")).toBeInTheDocument();
    expect(createRequested).not.toHaveBeenCalled();
  });

  it("creates a slide, clears the form and shows a success toast", async () => {
    let createBody: unknown;
    mswServer.use(
      http.get(`${API_BASE}/hero-slides/admin`, () => okJson([])),
      http.post(`${API_BASE}/hero-slides`, async ({ request }) => {
        createBody = await request.json();
        return okJson(heroSlide("new", "Dashain Edit"));
      }),
    );

    const user = userEvent.setup();
    renderPage();

    const tagField = await screen.findByLabelText("Tag");
    await user.type(tagField, "Collection 02");
    await user.type(screen.getByLabelText("Title"), "Dashain Edit");
    await user.type(screen.getByLabelText("Description"), "Styled full looks.");
    await user.type(screen.getByLabelText("CTA label"), "Explore");
    await user.type(screen.getByLabelText("CTA link"), "/collections/dashain");
    await user.click(screen.getByRole("button", { name: "Create slide" }));

    await waitFor(() =>
      expect(createBody).toEqual({
        tag: "Collection 02",
        title: "Dashain Edit",
        description: "Styled full looks.",
        ctaLabel: "Explore",
        ctaHref: "/collections/dashain",
      }),
    );
    expect(await screen.findByText("Hero slide created.")).toBeInTheDocument();
    await waitFor(() => expect(tagField).toHaveValue(""));
  });

  it("shows an error toast when publishing a slide fails", async () => {
    mswServer.use(
      http.get(`${API_BASE}/hero-slides/admin`, () =>
        okJson([heroSlide("slide-1", "Dashain Edit")]),
      ),
      http.patch(`${API_BASE}/hero-slides/slide-1`, () =>
        HttpResponse.json(
          { success: false, message: "Only platform staff can publish hero slides." },
          { status: 403 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Unpublish" }));

    expect(
      await screen.findByText("Only platform staff can publish hero slides."),
    ).toBeInTheDocument();
  });

  it("shows an empty state when there are no hero slides", async () => {
    mswServer.use(http.get(`${API_BASE}/hero-slides/admin`, () => okJson([])));

    renderPage();

    expect(await screen.findByText("No hero slides yet.")).toBeInTheDocument();
  });
});
