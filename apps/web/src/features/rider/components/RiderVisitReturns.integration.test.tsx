import { Toaster } from "@outfiqe/design-system";
import { mswServer } from "@test/integration/msw/server";
import { createQueryClientWrapper } from "@test/integration/queryClientWrapper";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as PendingScansContextModule from "../context/PendingScansContext";
import { usePendingScans } from "../context/PendingScansContext";
import { RiderVisitPage } from "./RiderVisitPage";

vi.mock("../context/PendingScansContext", async (importOriginal) => ({
  ...(await importOriginal<typeof PendingScansContextModule>()),
  usePendingScans: vi.fn(),
}));
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const TASK_URL = "/api/logistics/rider/tasks/task-1";

const returnStop = {
  id: "stop-1",
  direction: "RETURN",
  brandReturn: {
    brandReturnId: "return-1",
    orderId: "8b3f4e3a-6dac",
    source: "PARCEL_RETURNED",
    unitCount: 2,
  },
  fulfilmentGroupId: "group-1",
  orderId: "8b3f4e3a-6dac",
  itemCount: 2,
  isCollected: false,
  bagTagCode: null,
};

const returnVisit = {
  id: "task-1",
  status: "ASSIGNED",
  roundStartsAt: "2026-10-17T05:15:00.000Z",
  brandName: "Kathmandu Knits",
  pickupLocation: {
    label: "Studio",
    contactName: "Mina",
    contactPhoneE164: "+9779812345678",
    address: "Jhamsikhel Road",
    landmark: null,
    city: "Lalitpur",
    latitude: null,
    longitude: null,
    openingNote: null,
  },
  stops: [returnStop],
};

const okJson = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

beforeEach(() => {
  vi.mocked(usePendingScans).mockReturnValue({
    pendingScans: [],
    queueCollectScan: vi.fn(),
    retryPendingScan: vi.fn(),
    discardPendingScan: vi.fn(),
  });
});

describe("returns on a rider visit", () => {
  it("lists what to hand back and records the hand-over", async () => {
    let dropOffBody: unknown;
    mswServer.use(
      http.get(TASK_URL, () => okJson(returnVisit)),
      http.post(`${TASK_URL}/return-drop-offs`, async ({ request }) => {
        dropOffBody = await request.json();
        return okJson({
          ...returnVisit,
          status: "COMPLETED",
          stops: [{ ...returnStop, isCollected: true }],
        });
      }),
    );
    const user = userEvent.setup();
    render(
      <>
        <RiderVisitPage taskId="task-1" />
        <Toaster />
      </>,
      { wrapper: createQueryClientWrapper() },
    );

    expect(await screen.findByText("Hand back to the brand")).toBeInTheDocument();
    expect(screen.getByText(/2 unit\(s\) · parcel came back/)).toBeInTheDocument();
    expect(screen.queryByText(/Bags:/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Handed to the brand" }));

    await waitFor(() => expect(dropOffBody).toEqual({ brandReturnId: "return-1" }));
  });
});
