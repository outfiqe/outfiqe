import type { ConversationMember } from "@outfiqe/types";
import { mswServer } from "@test/integration/msw/server";
import { createQueryClientWrapper } from "@test/integration/queryClientWrapper";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth";

import { GroupInfoPanel } from "./GroupInfoPanel";

vi.mock("@/features/auth", () => ({ useAuth: vi.fn() }));

const CONVERSATION_ID = "group-1";
const JOINED_AT = "2026-09-01T10:00:00.000Z";

const buildMember = (
  id: string,
  name: string,
  role: ConversationMember["role"],
): ConversationMember => ({ id, name, handle: id, avatarUrl: null, role, joinedAt: JOINED_AT });

const ME = buildMember("user-me", "Sita Rai", "ADMIN");
const RAM = buildMember("user-ram", "Ram Thapa", "MEMBER");

const mockMembers = (members: ConversationMember[]) => {
  mswServer.use(
    http.get(`/api/conversations/${CONVERSATION_ID}/members`, () =>
      HttpResponse.json({ success: true, message: "Group members.", data: { members } }),
    ),
  );
};

const renderPanel = (myRole: ConversationMember["role"], onLeft = vi.fn()) => ({
  onLeft,
  ...render(
    <GroupInfoPanel
      open
      onClose={vi.fn()}
      conversationId={CONVERSATION_ID}
      groupName="Dashain outfits"
      myRole={myRole}
      onLeft={onLeft}
    />,
    { wrapper: createQueryClientWrapper() },
  ),
});

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    state: { user: { id: ME.id } },
  } as ReturnType<typeof useAuth>);
});

describe("GroupInfoPanel", () => {
  it("lists everyone, marks admins and shows which one is you", async () => {
    mockMembers([ME, RAM]);
    renderPanel("ADMIN");

    expect(await screen.findByText("Sita Rai (you)")).toBeInTheDocument();
    expect(screen.getByText("Ram Thapa")).toBeInTheDocument();
    expect(screen.getByText("2 people")).toBeInTheDocument();
    expect(screen.getAllByText("Admin")).toHaveLength(1);
  });

  it("gives admins the tools to rename, manage people and add more", async () => {
    mockMembers([ME, RAM]);
    renderPanel("ADMIN");

    await screen.findByText("Ram Thapa");
    expect(screen.getByLabelText("Group name")).toHaveValue("Dashain outfits");
    expect(screen.getByRole("button", { name: "Make admin" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove Ram Thapa from the group" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Add people" })).toBeInTheDocument();
  });

  it("shows plain members the people but none of the admin tools", async () => {
    mockMembers([buildMember(ME.id, ME.name, "MEMBER"), buildMember(RAM.id, RAM.name, "ADMIN")]);
    renderPanel("MEMBER");

    await screen.findByText("Ram Thapa");
    expect(screen.queryByLabelText("Group name")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Make admin" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Add people" })).not.toBeInTheDocument();
  });

  it("makes someone an admin and shows the updated list", async () => {
    mockMembers([ME, RAM]);
    mswServer.use(
      http.patch(`/api/conversations/${CONVERSATION_ID}/members/${RAM.id}`, () =>
        HttpResponse.json({
          success: true,
          message: "Member role updated.",
          data: { members: [ME, { ...RAM, role: "ADMIN" }] },
        }),
      ),
    );
    const user = userEvent.setup();
    renderPanel("ADMIN");

    await user.click(await screen.findByRole("button", { name: "Make admin" }));

    await waitFor(() => expect(screen.getAllByText("Admin")).toHaveLength(2));
  });

  it("shows the server's reason when an action is refused", async () => {
    mockMembers([ME, RAM]);
    mswServer.use(
      http.patch(`/api/conversations/${CONVERSATION_ID}/members/${ME.id}`, () =>
        HttpResponse.json(
          {
            success: false,
            message: "A group needs at least one admin. Make someone else an admin first.",
            code: "LAST_GROUP_ADMIN",
          },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderPanel("ADMIN");

    await user.click(await screen.findByRole("button", { name: "Step down as admin" }));

    expect(
      await screen.findByText(
        "A group needs at least one admin. Make someone else an admin first.",
      ),
    ).toBeInTheDocument();
  });

  it("asks before leaving, then leaves", async () => {
    mockMembers([ME, RAM]);
    let hasLeft = false;
    mswServer.use(
      http.post(`/api/conversations/${CONVERSATION_ID}/leave`, () => {
        hasLeft = true;
        return HttpResponse.json({ success: true, message: "You left the group.", data: {} });
      }),
    );
    const user = userEvent.setup();
    const { onLeft } = renderPanel("ADMIN");

    await user.click(await screen.findByRole("button", { name: "Leave group" }));
    expect(hasLeft).toBe(false);
    expect(screen.getByText(/Leave Dashain outfits\?/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Yes, leave" }));

    await waitFor(() => expect(onLeft).toHaveBeenCalled());
    expect(hasLeft).toBe(true);
  });

  it("offers a retry when the members can't be loaded", async () => {
    mswServer.use(
      http.get(`/api/conversations/${CONVERSATION_ID}/members`, () =>
        HttpResponse.json(
          { success: false, message: "Oops", code: "INTERNAL_ERROR" },
          { status: 500 },
        ),
      ),
    );
    renderPanel("ADMIN");

    expect(await screen.findByText("Couldn't load the members.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
