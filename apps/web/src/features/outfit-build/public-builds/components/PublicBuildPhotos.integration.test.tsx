import { mswServer } from "@test/integration/msw/server";
import { createTranslatedQueryWrapper } from "@test/integration/translationsWrapper";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import type { OutfitPhoto } from "../../api/outfitSchemas";
import { SITA } from "../../testing/outfitFixtures";
import { PublicBuildPhotos } from "./PublicBuildPhotos";

const REPORT_ACCEPTED_STATUS = 202;

const photo = (overrides: Partial<OutfitPhoto> = {}): OutfitPhoto => ({
  id: "photo-1",
  kind: "COVER",
  status: "READY",
  image: { url: "https://cdn.outfiqe.test/photo-1.jpg", lqip: null, sources: [] },
  uploadedBy: SITA,
  coverPosition: null,
  createdAt: "2026-10-04T10:00:00.000Z",
  ...overrides,
});

const renderPhotos = (photos: OutfitPhoto[], canReport = true) => {
  const { Wrapper } = createTranslatedQueryWrapper();
  return render(<PublicBuildPhotos photos={photos} canReport={canReport} />, { wrapper: Wrapper });
};

describe("PublicBuildPhotos", () => {
  it("shows build photos and try-on photos in separate galleries", () => {
    renderPhotos([photo(), photo({ id: "try-on-1", kind: "TRY_ON" })]);

    expect(screen.getByRole("heading", { name: "Photos" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Try-on photos" })).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: "Photo added by Sita Rai" })).toHaveLength(2);
  });

  it("shows nothing when the build has no photos", () => {
    const { container } = renderPhotos([]);

    expect(container).toBeEmptyDOMElement();
  });

  it("reports a photo as an OUTFIT_PHOTO", async () => {
    let reportBody: unknown;
    mswServer.use(
      http.post("/api/content-reports", async ({ request }) => {
        reportBody = await request.json();
        return HttpResponse.json(
          { success: true, message: "ok", data: null },
          { status: REPORT_ACCEPTED_STATUS },
        );
      }),
    );
    const user = userEvent.setup();
    renderPhotos([photo()]);

    await user.click(screen.getByRole("button", { name: "Report this photo" }));
    await user.click(await screen.findByRole("button", { name: "Report" }));

    await waitFor(() =>
      expect(reportBody).toMatchObject({
        targetType: "OUTFIT_PHOTO",
        targetId: "photo-1",
        reason: "SPAM",
      }),
    );
  });

  it("hides the report button from signed-out visitors", () => {
    renderPhotos([photo()], false);

    expect(screen.queryByRole("button", { name: "Report this photo" })).not.toBeInTheDocument();
  });
});
