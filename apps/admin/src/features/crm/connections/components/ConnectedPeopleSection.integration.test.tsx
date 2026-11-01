import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { ConnectedPeopleSection } from "./ConnectedPeopleSection";

const API_BASE = "http://localhost:3000/api";

const mockPeople = (people: unknown[]) =>
  mswServer.use(
    http.get(`${API_BASE}/crm/connections`, () =>
      HttpResponse.json({
        success: true,
        data: { people, contacts: [], deals: [], tickets: [], tasks: [] },
      }),
    ),
  );

describe("ConnectedPeopleSection", () => {
  it("says a customer who is also a partner is the same person", async () => {
    mockPeople([{ userId: "u-1", name: "Anjesh Ghimire", handle: "anjesh", role: "partner" }]);
    renderWithRouter(
      <ConnectedPeopleSection subject={{ subjectType: "customer", subjectId: "u-1" }} />,
    );

    expect(await screen.findByRole("link", { name: /Also a partner/ })).toHaveAttribute(
      "href",
      "/crm/partners/u-1",
    );
    expect(screen.getByText("This is the same person.")).toBeInTheDocument();
    expect(screen.queryByText("Anjesh Ghimire")).not.toBeInTheDocument();
  });

  it("names someone else connected to the record", async () => {
    mockPeople([{ userId: "u-2", name: "Aasha Muse", handle: "aasha", role: "partner" }]);
    renderWithRouter(
      <ConnectedPeopleSection subject={{ subjectType: "deal", subjectId: "d-1" }} />,
    );

    expect(await screen.findByRole("link", { name: /Aasha Muse/ })).toBeInTheDocument();
    expect(screen.getByText("@aasha")).toBeInTheDocument();
  });
});
