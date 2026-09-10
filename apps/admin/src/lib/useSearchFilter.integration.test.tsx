import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { oneOfFilter, rawTextFilter, useSearchFilter } from "./useSearchFilter";

const STATUSES = ["ALL", "PLACED", "SHIPPED"] as const;
const STATUS_FILTER = oneOfFilter<(typeof STATUSES)[number]>(STATUSES, "ALL");

const StatusProbe = () => {
  const [status, setStatus] = useSearchFilter("status", STATUS_FILTER);
  return (
    <div>
      <p data-testid="value">{status}</p>
      {STATUSES.map((candidate) => (
        <button key={candidate} type="button" onClick={() => setStatus(candidate)}>
          {candidate}
        </button>
      ))}
    </div>
  );
};

const TextProbe = () => {
  const [term, setTerm] = useSearchFilter("q", rawTextFilter);
  return (
    <div>
      <p data-testid="value">{term || "(empty)"}</p>
      <button type="button" onClick={() => setTerm("denim")}>
        set
      </button>
      <button type="button" onClick={() => setTerm("")}>
        clear
      </button>
    </div>
  );
};

describe("useSearchFilter", () => {
  it("falls back to the default when the param is absent", async () => {
    renderWithRouter(<StatusProbe />, { path: "/orders" });
    expect(await screen.findByTestId("value")).toHaveTextContent("ALL");
  });

  it("reads a valid value straight from the URL", async () => {
    renderWithRouter(<StatusProbe />, { path: "/orders", initialEntry: "/orders?status=SHIPPED" });
    expect(await screen.findByTestId("value")).toHaveTextContent("SHIPPED");
  });

  it("falls back to the default when the param holds an unknown value", async () => {
    renderWithRouter(<StatusProbe />, { path: "/orders", initialEntry: "/orders?status=BOGUS" });
    expect(await screen.findByTestId("value")).toHaveTextContent("ALL");
  });

  it("writes the chosen value to the URL and drops it again when the default is picked", async () => {
    const user = userEvent.setup({ delay: null });
    const { router } = renderWithRouter(<StatusProbe />, { path: "/orders" });

    await user.click(await screen.findByRole("button", { name: "PLACED" }));
    await waitFor(() => expect(screen.getByTestId("value")).toHaveTextContent("PLACED"));
    expect(router.state.location.search).toEqual({ status: "PLACED" });

    await user.click(screen.getByRole("button", { name: "ALL" }));
    await waitFor(() => expect(screen.getByTestId("value")).toHaveTextContent("ALL"));
    expect(router.state.location.search).toEqual({});
  });

  it("replaces history rather than pushing a new entry per filter change", async () => {
    const user = userEvent.setup({ delay: null });
    const { router } = renderWithRouter(<StatusProbe />, { path: "/orders" });
    await screen.findByRole("button", { name: "PLACED" });
    const lengthBefore = router.history.length;

    await user.click(screen.getByRole("button", { name: "PLACED" }));
    await user.click(screen.getByRole("button", { name: "SHIPPED" }));

    expect(router.history.length).toBe(lengthBefore);
  });

  it("round-trips free-text values and clears them on empty", async () => {
    const user = userEvent.setup({ delay: null });
    const { router } = renderWithRouter(<TextProbe />, { path: "/orders" });

    await user.click(await screen.findByRole("button", { name: "set" }));
    await waitFor(() => expect(screen.getByTestId("value")).toHaveTextContent("denim"));
    expect(router.state.location.search).toEqual({ q: "denim" });

    await user.click(screen.getByRole("button", { name: "clear" }));
    await waitFor(() => expect(screen.getByTestId("value")).toHaveTextContent("(empty)"));
    expect(router.state.location.search).toEqual({});
  });
});
