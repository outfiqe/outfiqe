import { mswServer } from "@test/integration/msw/server";
import { createQueryClientWrapper } from "@test/integration/queryClientWrapper";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as PendingScansContextModule from "../context/PendingScansContext";
import { usePendingScans } from "../context/PendingScansContext";
import { RiderTasksPage } from "./RiderTasksPage";

vi.mock("../context/PendingScansContext", async (importOriginal) => ({
  ...(await importOriginal<typeof PendingScansContextModule>()),
  usePendingScans: vi.fn(),
}));
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const RIDER_TASKS_URL = "/api/logistics/rider/tasks";

const openTask = {
  id: "task-1",
  status: "IN_PROGRESS",
  roundStartsAt: "2026-10-16T05:15:00.000Z",
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
  stops: [
    {
      id: "stop-1",
      fulfilmentGroupId: "group-1",
      orderId: "6f1d2c1e-4b8a",
      itemCount: 2,
      isCollected: true,
      bagTagCode: "ABCDEFGHJK",
    },
    {
      id: "stop-2",
      fulfilmentGroupId: "group-2",
      orderId: "7a2e3d2f-5c9b",
      itemCount: 1,
      isCollected: false,
      bagTagCode: null,
    },
  ],
};

const renderTasksPage = () => render(<RiderTasksPage />, { wrapper: createQueryClientWrapper() });

beforeEach(() => {
  vi.mocked(usePendingScans).mockReturnValue({
    pendingScans: [],
    queueCollectScan: vi.fn(),
    retryPendingScan: vi.fn(),
    discardPendingScan: vi.fn(),
  });
});

describe("RiderTasksPage", () => {
  it("lists the rider's visits with their progress", async () => {
    mswServer.use(
      http.get(RIDER_TASKS_URL, () =>
        HttpResponse.json({ success: true, message: "Your visits.", data: { tasks: [openTask] } }),
      ),
    );

    renderTasksPage();

    const visitLink = await screen.findByRole("link", { name: /Kathmandu Knits/ });
    expect(visitLink).toHaveAttribute("href", "/rider/visits/task-1");
    expect(visitLink).toHaveTextContent("1 of 2 bags collected");
  });

  it("says so when there are no visits", async () => {
    mswServer.use(
      http.get(RIDER_TASKS_URL, () =>
        HttpResponse.json({ success: true, message: "Your visits.", data: { tasks: [] } }),
      ),
    );

    renderTasksPage();

    expect(await screen.findByText(/No visits for you right now/)).toBeInTheDocument();
  });

  it("offers a retry when the visits can't load", async () => {
    mswServer.use(http.get(RIDER_TASKS_URL, () => HttpResponse.error()));

    renderTasksPage();

    expect(await screen.findByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getByText(/Check your signal and try again/)).toBeInTheDocument();
  });

  it("tells a rider who isn't activated yet why, instead of blaming their signal", async () => {
    mswServer.use(
      http.get(RIDER_TASKS_URL, () =>
        HttpResponse.json(
          {
            success: false,
            message: "Your rider account isn't active yet. Ask your hub lead.",
            code: "RIDER_NOT_ACTIVE",
          },
          { status: 403 },
        ),
      ),
    );

    renderTasksPage();

    expect(
      await screen.findByText("Your rider account isn't active yet. Ask your hub lead."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Check your signal/)).not.toBeInTheDocument();
  });
});
