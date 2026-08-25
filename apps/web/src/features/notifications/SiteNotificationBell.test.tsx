import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth";

import { SiteNotificationBell } from "./SiteNotificationBell";

vi.mock("@/features/auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@outfiqe/components", () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

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
