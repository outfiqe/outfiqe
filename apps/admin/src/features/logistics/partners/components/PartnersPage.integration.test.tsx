import { Toaster } from "@outfiqe/design-system";
import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { describe, expect, it } from "vitest";

import { buildHub, HUBS_URL, LOGISTICS_API_BASE, okJson } from "../../testing/logisticsFixtures";
import { PartnerDetailPage } from "./PartnerDetailPage";
import { PartnersPage } from "./PartnersPage";

const PARTNERS_URL = `${LOGISTICS_API_BASE}/partners`;
const DELIVERY_ZONES_URL = "http://localhost:3000/api/delivery-zones";

const buildPartner = (overrides: Record<string, unknown> = {}) => ({
  id: "partner-1",
  code: "valley",
  name: "Valley Courier",
  countryCode: "NP",
  adapterKey: "MANUAL",
  isActive: true,
  supportsBooking: false,
  supportsWebhooks: false,
  supportsPolling: false,
  supportsCod: true,
  supportsCodAmountUpdate: false,
  supportsCancel: false,
  webhookVerification: "NONE",
  referencePattern: null,
  codRemittanceDays: 7,
  trackingUrlTemplate: null,
  accounts: [
    {
      hubId: "hub-1",
      hubName: "Kathmandu Hub",
      merchantAccountRef: "OUTFIQE-01",
      pickupPointRef: null,
      credentialsKey: null,
      isActive: true,
    },
  ],
  zones: [],
  statusMappings: [{ rawStatus: "DELIVERED", canonicalCode: "DELIVERED", reasonCode: null }],
  ...overrides,
});

describe("PartnersPage", () => {
  it("shows an empty state and adds a manual partner", async () => {
    let createdBody: unknown;
    mswServer.use(
      http.get(PARTNERS_URL, () => okJson({ partners: [] })),
      http.post(PARTNERS_URL, async ({ request }) => {
        createdBody = await request.json();
        return okJson(buildPartner(), 201);
      }),
    );
    const user = userEvent.setup();
    renderWithRouter(
      <>
        <PartnersPage />
        <Toaster />
      </>,
      { path: "/logistics/partners" },
    );

    expect(await screen.findByText(/No delivery partners yet/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add partner" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Name"), "Valley Courier");
    await user.type(within(dialog).getByLabelText("Short code"), "valley");
    await user.click(within(dialog).getByRole("button", { name: "Save partner" }));

    await waitFor(() =>
      expect(createdBody).toMatchObject({
        code: "valley",
        name: "Valley Courier",
        countryCode: "NP",
        adapterKey: "MANUAL",
        supportsCod: true,
        referencePattern: null,
      }),
    );
  });
});

describe("PartnerDetailPage", () => {
  it("uploads a status sheet and lists what happened to each row", async () => {
    let importBody: unknown;
    mswServer.use(
      http.get(`${PARTNERS_URL}/partner-1`, () => okJson(buildPartner())),
      http.get(HUBS_URL, () => okJson({ hubs: [buildHub()] })),
      http.get(DELIVERY_ZONES_URL, () => okJson([])),
      http.post(`${PARTNERS_URL}/partner-1/status-imports`, async ({ request }) => {
        importBody = await request.json();
        return okJson(
          {
            id: "import-1",
            partnerId: "partner-1",
            fileName: "daily.csv",
            rowCount: 2,
            appliedCount: 1,
            createdAt: "2026-10-16T08:00:00.000Z",
            rows: [
              {
                rowNumber: 2,
                partnerReference: "PX-1",
                merchantReference: null,
                rawStatus: "Delivered",
                outcome: "APPLIED",
                message: null,
              },
              {
                rowNumber: 3,
                partnerReference: "PX-9",
                merchantReference: null,
                rawStatus: "Delivered",
                outcome: "UNMATCHED_REFERENCE",
                message: "No parcel with this partner matches that reference.",
              },
            ],
          },
          201,
        );
      }),
    );
    const user = userEvent.setup();
    const { container } = renderWithRouter(<PartnerDetailPage partnerId="partner-1" />, {
      path: "/logistics/partners/partner-1",
    });

    expect(await screen.findByRole("heading", { name: "Valley Courier" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("DELIVERED")).toBeInTheDocument();
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    if (!fileInput) throw new Error("The sheet upload input is missing");
    await user.upload(
      fileInput,
      new File(["Partner ID,Status,Time\nPX-1,Delivered,2026-10-16 14:30\n"], "daily.csv", {
        type: "text/csv",
      }),
    );

    expect(await screen.findByText("daily.csv: 1 of 2 rows applied")).toBeInTheDocument();
    expect(screen.getByText("No matching parcel")).toBeInTheDocument();
    expect(importBody).toEqual({
      fileName: "daily.csv",
      csv: "Partner ID,Status,Time\nPX-1,Delivered,2026-10-16 14:30\n",
    });
  });
});
