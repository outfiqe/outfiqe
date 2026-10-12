import { mswServer } from "@test/integration/msw/server";
import { createQueryClientWrapper } from "@test/integration/queryClientWrapper";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { NewGroupModal } from "./NewGroupModal";

const RAM = { id: "user-ram", name: "Ram Thapa", handle: "ram", avatarUrl: null };
const SITA = { id: "user-sita", name: "Sita Rai", handle: "sita", avatarUrl: null };
const CREATED_GROUP_ID = "group-1";
const UUID_PATTERN = /^[0-9a-f-]{36}$/;

const mockContactSearch = () => {
  mswServer.use(
    http.get("/api/chat/blocks/search", () =>
      HttpResponse.json({ success: true, message: "Contacts.", data: { contacts: [RAM, SITA] } }),
    ),
  );
};

const renderModal = (onCreated = vi.fn()) => ({
  onCreated,
  ...render(<NewGroupModal open onClose={vi.fn()} onCreated={onCreated} />, {
    wrapper: createQueryClientWrapper(),
  }),
});

const fillInGroup = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText("Group name"), "Dashain outfits");
  await user.type(screen.getByLabelText("Search people"), "a");
  await user.click(await screen.findByLabelText(/Ram Thapa/));
};

describe("NewGroupModal", () => {
  it("keeps Create disabled until the group has a name and at least one person", async () => {
    mockContactSearch();
    const user = userEvent.setup();
    renderModal();

    const createButton = screen.getByRole("button", { name: "Create group" });
    expect(createButton).toBeDisabled();

    await user.type(screen.getByLabelText("Group name"), "Dashain outfits");
    expect(createButton).toBeDisabled();

    await user.type(screen.getByLabelText("Search people"), "a");
    await user.click(await screen.findByLabelText(/Ram Thapa/));
    expect(createButton).toBeEnabled();
  });

  it("creates the group with an idempotency key and opens it", async () => {
    mockContactSearch();
    let sentBody: unknown;
    let sentIdempotencyKey: string | null = null;
    mswServer.use(
      http.post("/api/conversations/groups", async ({ request }) => {
        sentBody = await request.json();
        sentIdempotencyKey = request.headers.get("Idempotency-Key");
        return HttpResponse.json(
          { success: true, message: "Group created.", data: { id: CREATED_GROUP_ID } },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    const { onCreated } = renderModal();

    await fillInGroup(user);
    await user.click(screen.getByRole("button", { name: "Create group" }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(CREATED_GROUP_ID));
    expect(sentBody).toEqual({ name: "Dashain outfits", memberIds: [RAM.id] });
    expect(sentIdempotencyKey).toMatch(UUID_PATTERN);
  });

  it("shows the server's reason when the group can't be created", async () => {
    mockContactSearch();
    mswServer.use(
      http.post("/api/conversations/groups", () =>
        HttpResponse.json(
          {
            success: false,
            message: "Some of these people can't be added to a group right now.",
            code: "MEMBERS_UNREACHABLE",
          },
          { status: 422 },
        ),
      ),
    );
    const user = userEvent.setup();
    const { onCreated } = renderModal();

    await fillInGroup(user);
    await user.click(screen.getByRole("button", { name: "Create group" }));

    expect(
      await screen.findByText("Some of these people can't be added to a group right now."),
    ).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("lets a picked person be taken off again", async () => {
    mockContactSearch();
    const user = userEvent.setup();
    renderModal();

    await fillInGroup(user);
    await user.click(screen.getByRole("button", { name: "Remove Ram Thapa" }));

    expect(screen.queryByRole("list", { name: "Selected people" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create group" })).toBeDisabled();
  });
});
