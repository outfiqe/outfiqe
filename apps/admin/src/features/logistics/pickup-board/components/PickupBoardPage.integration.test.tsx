import { mswServer } from "@test/integration/msw/server";
import { grantEveryPlatformPermission } from "@test/platformPermissionsMock";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterEach, describe, expect, it } from "vitest";

import {
  buildHub,
  buildRider,
  emptyPage,
  HUBS_URL,
  LOGISTICS_API_BASE,
  okJson,
} from "../../testing/logisticsFixtures";
import { PickupBoardPage } from "./PickupBoardPage";

const PICKUP_BOARD_URL = `${LOGISTICS_API_BASE}/pickup-board`;
const RIDER_TASKS_URL = `${LOGISTICS_API_BASE}/rider-tasks`;
const RIDERS_URL = `${LOGISTICS_API_BASE}/riders`;

const waitingLocation = {
  pickupLocationId: "location-1",
  label: "Studio",
  brandId: "brand-1",
  brandName: "Kathmandu Knits",
  address: "Jhamsikhel Road",
  city: "Lalitpur",
  pickups: [
    {
      fulfilmentGroupId: "group-1",
      orderId: "6f1d2c1e-4b8a",
      itemCount: 2,
      readyForPickupAt: "2026-10-16T04:00:00.000Z",
    },
    {
      fulfilmentGroupId: "group-2",
      orderId: "7a2e3d2f-5c9b",
      itemCount: 1,
      readyForPickupAt: null,
    },
  ],
};

const assignedTask = {
  id: "task-1",
  status: "ASSIGNED",
  roundStartsAt: "2026-10-16T05:15:00.000Z",
  riderId: "rider-1",
  riderName: "Asha Rider",
  brandName: "Kathmandu Knits",
  pickupLocationLabel: "Studio",
  stopCount: 2,
  collectedCount: 0,
  assignedAt: "2026-10-16T04:30:00.000Z",
  completedAt: null,
  wastedReason: null,
};

const renderBoard = () =>
  renderWithRouter(<PickupBoardPage />, { path: "/logistics/pickup-board" });

afterEach(() => {
  grantEveryPlatformPermission();
});

describe("PickupBoardPage", () => {
  it("assigns the chosen bags at a location to a rider", async () => {
    let assignBody: unknown;
    mswServer.use(
      http.get(HUBS_URL, () => okJson({ hubs: [buildHub()] })),
      http.get(PICKUP_BOARD_URL, () => okJson({ items: [waitingLocation], nextCursor: null })),
      http.get(RIDER_TASKS_URL, () => okJson(emptyPage)),
      http.get(RIDERS_URL, () => okJson({ items: [buildRider()], nextCursor: null })),
      http.post(RIDER_TASKS_URL, async ({ request }) => {
        assignBody = await request.json();
        return okJson(assignedTask, 201);
      }),
    );
    const user = userEvent.setup();
    renderBoard();

    expect(await screen.findByText("Kathmandu Knits")).toBeInTheDocument();
    const [secondBagCheckbox] = screen.getAllByRole("checkbox").slice(1);
    if (secondBagCheckbox) await user.click(secondBagCheckbox);
    await user.click(screen.getByRole("button", { name: "Assign rider" }));
    await screen.findByRole("option", { name: "Asha Rider" });
    await user.click(screen.getByRole("button", { name: "Assign visit" }));

    await waitFor(() =>
      expect(assignBody).toMatchObject({ riderId: "rider-1", fulfilmentGroupIds: ["group-1"] }),
    );
  });

  it("sends returns back to the brand on a visit", async () => {
    let assignBody: unknown;
    const returnOnlyLocation = {
      ...waitingLocation,
      pickups: [],
      returns: [
        {
          brandReturnId: "return-1",
          orderId: "8b3f4e3a-6dac",
          source: "PARCEL_RETURNED",
          unitCount: 2,
        },
      ],
    };
    mswServer.use(
      http.get(HUBS_URL, () => okJson({ hubs: [buildHub()] })),
      http.get(PICKUP_BOARD_URL, () => okJson({ items: [returnOnlyLocation], nextCursor: null })),
      http.get(RIDER_TASKS_URL, () => okJson(emptyPage)),
      http.get(RIDERS_URL, () => okJson({ items: [buildRider()], nextCursor: null })),
      http.post(RIDER_TASKS_URL, async ({ request }) => {
        assignBody = await request.json();
        return okJson(assignedTask, 201);
      }),
    );
    const user = userEvent.setup();
    renderBoard();

    expect(await screen.findByText(/Take back order #8B3F4E3A/)).toBeInTheDocument();
    expect(screen.getByText(/parcel came back/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Assign rider" }));
    await screen.findByRole("option", { name: "Asha Rider" });
    await user.click(screen.getByRole("button", { name: "Assign visit" }));

    await waitFor(() =>
      expect(assignBody).toMatchObject({ fulfilmentGroupIds: [], brandReturnIds: ["return-1"] }),
    );
  });

  it("says when nothing is waiting and lists earlier visits", async () => {
    mswServer.use(
      http.get(HUBS_URL, () => okJson({ hubs: [buildHub()] })),
      http.get(PICKUP_BOARD_URL, () => okJson(emptyPage)),
      http.get(RIDER_TASKS_URL, () => okJson({ items: [assignedTask], nextCursor: null })),
    );
    renderBoard();

    expect(
      await screen.findByText("Nothing waiting. Every ready bag already has a rider."),
    ).toBeInTheDocument();
    expect(await screen.findByText("Asha Rider → Kathmandu Knits")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel visit" })).toBeInTheDocument();
  });
});
