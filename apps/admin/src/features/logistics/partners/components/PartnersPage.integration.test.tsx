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
  webhookUrl: null,
  accounts: [
    {
      hubId: "hub-1",
      hubName: "Kathmandu Hub",
      merchantAccountRef: "OUTFIQE-01",
      pickupPointRef: null,
      credentialsKey: null,
      credentials: {
        hasApiKey: false,
        hasBaseUrl: false,
        hasWebhookSecret: false,
        hasPreviousWebhookSecret: false,
      },
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
        webhookVerification: "NONE",
        referencePattern: null,
      }),
    );
  });

  it("asks how a connected partner sends updates", async () => {
    let createdBody: unknown;
    mswServer.use(
      http.get(PARTNERS_URL, () => okJson({ partners: [] })),
      http.post(PARTNERS_URL, async ({ request }) => {
        createdBody = await request.json();
        return okJson(buildPartner({ adapterKey: "HTTP_JSON" }), 201);
      }),
    );
    const user = userEvent.setup();
    renderWithRouter(<PartnersPage />, { path: "/logistics/partners" });

    await user.click(await screen.findByRole("button", { name: "Add partner" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByLabelText("How they send parcel updates")).not.toBeInTheDocument();
    await user.type(within(dialog).getByLabelText("Name"), "Valley Courier");
    await user.type(within(dialog).getByLabelText("Short code"), "valley");
    expect(within(dialog).queryByText(/go in the server settings/)).not.toBeInTheDocument();
    await user.selectOptions(within(dialog).getByLabelText("Connection"), "HTTP_JSON");
    expect(within(dialog).getByText(/go in the server settings, never here/)).toBeInTheDocument();
    expect(
      within(dialog).getByText(/appears on the partner's page after you save/),
    ).toBeInTheDocument();
    await user.selectOptions(
      within(dialog).getByLabelText("How they send parcel updates"),
      "SIGNATURE",
    );
    await user.click(within(dialog).getByRole("button", { name: "Save partner" }));

    await waitFor(() =>
      expect(createdBody).toMatchObject({
        adapterKey: "HTTP_JSON",
        webhookVerification: "SIGNATURE",
      }),
    );
  });
});

describe("PartnerDetailPage", () => {
  it("shows a connected partner's update address, secrets and updates, and replays missed ones", async () => {
    let replayBody: unknown;
    const connectedPartner = buildPartner({
      adapterKey: "HTTP_JSON",
      supportsBooking: true,
      supportsWebhooks: true,
      webhookVerification: "SIGNATURE",
      webhookUrl: "https://api.outfiqe.com/api/webhooks/delivery-partners/valley",
      accounts: [
        {
          hubId: "hub-1",
          hubName: "Kathmandu Hub",
          merchantAccountRef: "OUTFIQE-01",
          pickupPointRef: null,
          credentialsKey: "VALLEY_KTM",
          credentials: {
            hasApiKey: true,
            hasBaseUrl: true,
            hasWebhookSecret: false,
            hasPreviousWebhookSecret: false,
          },
          isActive: true,
        },
      ],
    });
    mswServer.use(
      http.get(`${PARTNERS_URL}/partner-1`, () => okJson(connectedPartner)),
      http.get(HUBS_URL, () => okJson({ hubs: [buildHub()] })),
      http.get(DELIVERY_ZONES_URL, () => okJson([])),
      http.get(`${PARTNERS_URL}/partner-1/webhook-receipts`, () =>
        okJson({
          items: [
            {
              id: "receipt-1",
              signatureValid: true,
              receivedAt: "2026-10-17T08:00:00.000Z",
              processedAt: "2026-10-17T08:00:01.000Z",
              processingError: null,
              eventCount: 1,
              appliedCount: 0,
              unknownCount: 1,
            },
          ],
          nextCursor: null,
        }),
      ),
      http.post(`${PARTNERS_URL}/partner-1/webhook-receipts/replay`, async ({ request }) => {
        replayBody = await request.json();
        return okJson({ replayedCount: 1 });
      }),
    );
    const user = userEvent.setup();
    renderWithRouter(
      <>
        <PartnerDetailPage partnerId="partner-1" />
        <Toaster />
      </>,
      { path: "/logistics/partners/partner-1" },
    );

    expect(
      await screen.findByText("https://api.outfiqe.com/api/webhooks/delivery-partners/valley"),
    ).toBeInTheDocument();
    expect(screen.getByText("API key: set")).toBeInTheDocument();
    expect(screen.getByText("Update secret: not set")).toBeInTheDocument();
    expect(await screen.findByText("1 with a status we don't know")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Send missed updates again" }));

    await waitFor(() =>
      expect(replayBody).toEqual({ since: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) }),
    );
  });

  it("shows when a connected partner hasn't sent any updates yet", async () => {
    mswServer.use(
      http.get(`${PARTNERS_URL}/partner-1`, () =>
        okJson(buildPartner({ adapterKey: "HTTP_JSON", webhookVerification: "NONE" })),
      ),
      http.get(HUBS_URL, () => okJson({ hubs: [buildHub()] })),
      http.get(DELIVERY_ZONES_URL, () => okJson([])),
      http.get(`${PARTNERS_URL}/partner-1/webhook-receipts`, () =>
        okJson({ items: [], nextCursor: null }),
      ),
    );
    renderWithRouter(<PartnerDetailPage partnerId="partner-1" />, {
      path: "/logistics/partners/partner-1",
    });

    expect(await screen.findByText("No updates from this partner yet.")).toBeInTheDocument();
    expect(screen.getByText(/we ask them/)).toBeInTheDocument();
  });

  it("shows the delivery areas once after saving the first area for a partner with no status names", async () => {
    const kathmanduValley = {
      id: "zone-ktm",
      name: "Kathmandu Valley",
      countryCode: "NP",
      minDeliveryDays: 1,
      maxDeliveryDays: 2,
      isDefault: false,
      cities: ["Kathmandu", "Bhaktapur", "Lalitpur"],
      updatedAt: "2026-10-01T00:00:00.000Z",
      standardDeliveryFee: 100,
      freeDeliveryThreshold: 5000,
      codHandlingFee: 0,
    };
    const savedArea = {
      hubId: "hub-1",
      deliveryZoneId: kathmanduValley.id,
      deliveryZoneName: kathmanduValley.name,
      priority: 0,
      isActive: true,
    };
    let currentPartner = buildPartner({ statusMappings: [] });
    mswServer.use(
      http.get(`${PARTNERS_URL}/partner-1`, () => okJson(currentPartner)),
      http.get(HUBS_URL, () => okJson({ hubs: [buildHub()] })),
      http.get(DELIVERY_ZONES_URL, () => okJson([kathmanduValley])),
      http.put(`${PARTNERS_URL}/partner-1/zones`, () => {
        currentPartner = buildPartner({ statusMappings: [], zones: [savedArea] });
        return okJson(currentPartner);
      }),
    );
    const user = userEvent.setup();
    renderWithRouter(
      <>
        <PartnerDetailPage partnerId="partner-1" />
        <Toaster />
      </>,
      { path: "/logistics/partners/partner-1" },
    );

    await user.click(await screen.findByRole("checkbox", { name: /Kathmandu Valley/ }));
    await user.click(screen.getByRole("button", { name: "Save areas" }));

    expect(await screen.findByText("Delivery areas saved.")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getAllByRole("heading", { name: "Where they deliver" })).toHaveLength(1),
    );
    expect(screen.getAllByRole("heading", { name: "Their status names" })).toHaveLength(1);
    expect(screen.getByRole("checkbox", { name: /Kathmandu Valley/ })).toBeChecked();
  });

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
