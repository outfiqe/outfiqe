import type { Notification } from "@outfiqe/types";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth";

import { SiteNotificationBell } from "./SiteNotificationBell";

vi.mock("@/features/auth", () => ({
  useAuth: vi.fn(),
}));

const routerPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));

let capturedOnSelect: ((notification: Notification) => void) | undefined;
vi.mock("@outfiqe/components", () => ({
  NotificationBell: ({ onSelect }: { onSelect: (notification: Notification) => void }) => {
    capturedOnSelect = onSelect;
    return <div data-testid="notification-bell" />;
  },
}));

const buildNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: "notif-1",
  recipientId: "user-1",
  actorId: null,
  type: "ANNOUNCEMENT",
  entityType: null,
  entityId: null,
  targetSurface: null,
  targetPath: null,
  metadata: {},
  groupKey: null,
  actorCount: 1,
  isRead: false,
  readAt: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  ...overrides,
});

const fakeSocket = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };

vi.mock("@/shared/lib/socketClient", () => ({
  getSocket: vi.fn(() => fakeSocket),
  acquireSocketConnection: vi.fn(),
  releaseSocketConnection: vi.fn(),
}));

describe("SiteNotificationBell", () => {
  it("renders a skeleton placeholder, not nothing, while the session is still resolving", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isAuthResolved: false,
    } as ReturnType<typeof useAuth>);

    const { container } = render(<SiteNotificationBell />);

    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    expect(screen.queryByTestId("notification-bell")).not.toBeInTheDocument();
  });

  it("renders nothing once the session resolves to a signed-out visitor", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isAuthResolved: true,
    } as ReturnType<typeof useAuth>);

    const { container } = render(<SiteNotificationBell />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the real notification bell once signed in", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isAuthResolved: true,
      state: { user: { handle: "ada" } },
    } as ReturnType<typeof useAuth>);

    render(<SiteNotificationBell />);

    expect(screen.getByTestId("notification-bell")).toBeInTheDocument();
  });
});

describe("SiteNotificationBell handleSelect", () => {
  beforeEach(() => {
    routerPush.mockClear();
    capturedOnSelect = undefined;
  });

  const signIn = () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isAuthResolved: true,
      isStaff: false,
      state: { user: { handle: "ada" } },
    } as ReturnType<typeof useAuth>);
    render(<SiteNotificationBell />);
    if (!capturedOnSelect) throw new Error("expected NotificationBell to receive onSelect");
    return capturedOnSelect;
  };

  it("opens an external announcement link in a new tab", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const onSelect = signIn();

    onSelect(
      buildNotification({
        type: "ANNOUNCEMENT",
        targetSurface: null,
        targetPath: "https://forms.gle/survey",
      }),
    );

    expect(openSpy).toHaveBeenCalledWith(
      "https://forms.gle/survey",
      "_blank",
      "noopener,noreferrer",
    );
    openSpy.mockRestore();
  });

  it("does a full-page navigation for a cross-origin admin target", () => {
    const originalLocation = window.location;
    const assignMock = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, assign: assignMock },
    });
    const onSelect = signIn();

    onSelect(
      buildNotification({
        type: "BRAND_APPLICATION_SUBMITTED",
        targetSurface: "ADMIN",
        targetPath: "/platform/brand-applications",
      }),
    );

    expect(assignMock).toHaveBeenCalled();
    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
  });

  it("routes in-app for a plain web-surface target", () => {
    const onSelect = signIn();

    onSelect(
      buildNotification({
        type: "NEW_MESSAGE",
        targetSurface: "WEB",
        targetPath: "/messages/conversation-1",
      }),
    );

    expect(routerPush).toHaveBeenCalledWith("/messages/conversation-1");
  });

  it("does nothing when the notification has no resolvable destination", () => {
    const originalLocation = window.location;
    const assignMock = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, assign: assignMock },
    });
    const onSelect = signIn();

    onSelect(buildNotification({ type: "REVIEW_REQUESTED", entityId: null }));

    expect(routerPush).not.toHaveBeenCalled();
    expect(assignMock).not.toHaveBeenCalled();
    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
  });
});
