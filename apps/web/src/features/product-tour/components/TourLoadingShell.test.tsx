import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { TourLaunchProvider, useTourLaunch } from "../context/TourLaunchContext";
import { TourLoadingShell } from "./TourLoadingShell";

const StartTourLoadingButton = ({ href }: { href: string }) => {
  const { startTourLoading } = useTourLaunch();
  return (
    <button type="button" onClick={() => startTourLoading(href)}>
      Take the tour
    </button>
  );
};

const renderShell = () =>
  render(
    <TourLaunchProvider>
      <StartTourLoadingButton href="/overview?tour=brand-dashboard" />
      <TourLoadingShell />
    </TourLaunchProvider>,
  );

describe("TourLoadingShell", () => {
  it("renders nothing until a tour starts loading", () => {
    renderShell();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows a loading dialog once a tour replay link is clicked", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole("button", { name: "Take the tour" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("hides the dialog when its skip button is used", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole("button", { name: "Take the tour" }));
    await screen.findByRole("dialog");

    await user.click(screen.getByRole("button", { name: "Skip tour" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
