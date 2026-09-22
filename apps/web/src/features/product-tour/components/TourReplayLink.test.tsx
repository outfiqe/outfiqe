import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TourLaunchProvider, useTourLaunch } from "../context/TourLaunchContext";
import { TourReplayLink } from "./TourReplayLink";

const useLinkStatus = vi.fn(() => ({ pending: false }));
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    onNavigate,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    onNavigate?: () => void;
    [key: string]: unknown;
  }) => (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onNavigate?.();
      }}
      {...rest}
    >
      {children}
    </a>
  ),
  useLinkStatus: () => useLinkStatus(),
}));

beforeEach(() => {
  useLinkStatus.mockReturnValue({ pending: false });
});

const PendingTourHrefDisplay = () => {
  const { pendingTourHref } = useTourLaunch();
  return <p>{pendingTourHref ?? "idle"}</p>;
};

describe("TourReplayLink", () => {
  it("renders a link to the given href with the visible label", () => {
    render(<TourReplayLink href="/overview?tour=brand-dashboard" />);

    const link = screen.getByRole("link", { name: "Take the tour" });
    expect(link).toHaveAttribute("href", "/overview?tour=brand-dashboard");
  });

  it("hides the label visually but keeps it for screen readers when showLabel is false", () => {
    render(<TourReplayLink href="/overview" showLabel={false} />);

    const link = screen.getByRole("link", { name: "Take the tour" });
    expect(link.querySelector(".sr-only")).toHaveTextContent("Take the tour");
  });

  it("forwards className and title to the underlying link", () => {
    render(<TourReplayLink href="/overview" className="custom-class" title="Replay" />);

    const link = screen.getByRole("link", { name: "Take the tour" });
    expect(link).toHaveClass("custom-class");
    expect(link).toHaveAttribute("title", "Replay");
  });

  it("shows the pending indicator while the navigation is in flight", () => {
    useLinkStatus.mockReturnValue({ pending: true });
    render(<TourReplayLink href="/overview" />);

    const dot = screen.getByRole("link", { name: "Take the tour" }).querySelector(".rounded-full");
    expect(dot).toHaveClass("motion-safe:animate-pulse");
  });

  it("hides the pending indicator once the navigation settles", () => {
    useLinkStatus.mockReturnValue({ pending: false });
    render(<TourReplayLink href="/overview" />);

    const dot = screen.getByRole("link", { name: "Take the tour" }).querySelector(".rounded-full");
    expect(dot).toHaveClass("opacity-0");
    expect(dot).not.toHaveClass("motion-safe:animate-pulse");
  });

  it("tells the shared tour-launch context loading has started as soon as it's clicked", async () => {
    const user = userEvent.setup();
    render(
      <TourLaunchProvider>
        <TourReplayLink href="/overview?tour=brand-dashboard" />
        <PendingTourHrefDisplay />
      </TourLaunchProvider>,
    );

    expect(screen.getByText("idle")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Take the tour" }));

    expect(screen.getByText("/overview?tour=brand-dashboard")).toBeInTheDocument();
  });
});
