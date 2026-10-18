import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { buildHub, HUBS_URL, okJson } from "../../testing/logisticsFixtures";
import { CheckInPage } from "./CheckInPage";
import { HandoverPage } from "./HandoverPage";

const HUB_API_BASE = "http://localhost:3000/api/logistics/hub";

const checkedInBag = {
  fulfilmentGroupId: "group-1",
  orderId: "order-1",
  brandName: "Kathmandu Knits",
  pickupStatus: "AT_HUB",
  expectedUnits: 3,
  countedUnits: 3,
  hasCountMismatch: false,
};

const typeCode = async (user: ReturnType<typeof userEvent.setup>, label: string, code: string) => {
  await user.type(await screen.findByLabelText(label), code);
  await user.keyboard("{Enter}");
};

describe("CheckInPage", () => {
  it("needs a unit count, then checks a scanned bag in with an idempotency key", async () => {
    let sentBody: unknown;
    let sentKey: string | null = null;
    mswServer.use(
      http.get(HUBS_URL, () => okJson({ hubs: [buildHub()] })),
      http.post(`${HUB_API_BASE}/check-ins`, async ({ request }) => {
        sentBody = await request.json();
        sentKey = request.headers.get("Idempotency-Key");
        return okJson(checkedInBag);
      }),
    );
    const user = userEvent.setup();
    renderWithRouter(<CheckInPage />, { path: "/logistics/check-in" });

    expect(await screen.findByText(/Enter how many units/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Scan with camera" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Camera view for scanning")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Units in this bag"), "3");
    await typeCode(user, "Sticker or pickup code", "BT4410ABCD");

    expect(await screen.findByText("Kathmandu Knits checked in")).toBeInTheDocument();
    expect(sentBody).toEqual({ hubId: "hub-1", code: "BT4410ABCD", countedUnits: 3 });
    expect(sentKey).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("flags a short count and shows why a scan was refused", async () => {
    let scanCount = 0;
    mswServer.use(
      http.get(HUBS_URL, () => okJson({ hubs: [buildHub()] })),
      http.post(`${HUB_API_BASE}/check-ins`, () => {
        scanCount += 1;
        return scanCount === 1
          ? okJson({ ...checkedInBag, countedUnits: 2, hasCountMismatch: true })
          : HttpResponse.json(
              {
                success: false,
                code: "PICKUP_FOR_ANOTHER_HUB",
                message: "This bag belongs to a different hub.",
              },
              { status: 409 },
            );
      }),
    );
    const user = userEvent.setup();
    renderWithRouter(<CheckInPage />, { path: "/logistics/check-in" });

    await user.type(await screen.findByLabelText("Units in this bag"), "2");
    await typeCode(user, "Sticker or pickup code", "BT4410ABCD");
    expect(await screen.findByText(/Counted 2 of 3 units/)).toBeInTheDocument();

    await user.type(screen.getByLabelText("Units in this bag"), "1");
    await typeCode(user, "Sticker or pickup code", "BT9999ZZZZ");
    expect(await screen.findByText("This bag belongs to a different hub.")).toBeInTheDocument();
  });
});

describe("HandoverPage", () => {
  it("hands a scanned parcel over and lists refused ones with the reason", async () => {
    let scanCount = 0;
    mswServer.use(
      http.get(HUBS_URL, () => okJson({ hubs: [buildHub()] })),
      http.post(`${HUB_API_BASE}/handovers`, () => {
        scanCount += 1;
        return scanCount === 1
          ? okJson({
              shipmentId: "shipment-1",
              trackingCode: "OFQ7K2M9QAB",
              status: "HANDED_TO_PARTNER",
            })
          : HttpResponse.json(
              {
                success: false,
                code: "PARCEL_NOT_BOOKED",
                message: "Book this parcel with the partner first.",
              },
              { status: 409 },
            );
      }),
    );
    const user = userEvent.setup();
    renderWithRouter(<HandoverPage />, { path: "/logistics/handover" });

    await typeCode(user, "Parcel code", "OFQ7K2M9QAB");
    expect(await screen.findByText("OFQ-7K2M-9QAB")).toBeInTheDocument();
    await typeCode(user, "Parcel code", "OFQ0000AAAA");
    await waitFor(() =>
      expect(screen.getByText("Book this parcel with the partner first.")).toBeInTheDocument(),
    );
  });
});
