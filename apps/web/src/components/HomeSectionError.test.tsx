import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HomeSectionError } from "./HomeSectionError";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/shared/lib/appEnv", () => ({ IS_PROD: true }));

afterEach(() => {
  vi.clearAllMocks();
});

describe("HomeSectionError", () => {
  it("names the failed section in an alert without collapsing the rest of the page", () => {
    render(
      <HomeSectionError sectionName="Trending now" error={new Error("boom")} retry={vi.fn()} />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Trending now didn't load");
    expect(alert).toHaveTextContent("The rest of the page is fine");
  });

  it("reports the error to Sentry once", async () => {
    const Sentry = await import("@sentry/nextjs");
    const error = new Error("boom");

    render(<HomeSectionError sectionName="Collections" error={error} retry={vi.fn()} />);

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });

  it("re-renders the section when the retry button is pressed", async () => {
    const retry = vi.fn();
    render(
      <HomeSectionError sectionName="Creator looks" error={new Error("boom")} retry={retry} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("hides the raw error message in production", () => {
    render(
      <HomeSectionError
        sectionName="New arrivals"
        error={new Error("internal detail")}
        retry={vi.fn()}
      />,
    );

    expect(screen.queryByText("internal detail")).not.toBeInTheDocument();
  });
});
