import { describe, expect, it } from "vitest";

import { describeGroupEvent } from "./groupEventText";

const RAM = { id: "user-ram", name: "Ram" };
const SITA = { id: "user-sita", name: "Sita" };
const HARI = { id: "user-hari", name: "Hari" };

describe("describeGroupEvent", () => {
  it("says 'You' for the viewer's own actions and names everyone else", () => {
    const created = { type: "GROUP_CREATED", groupName: "Trip" } as const;

    expect(describeGroupEvent(created, "Sita", true)).toBe("You created the group");
    expect(describeGroupEvent(created, "Sita", false)).toBe("Sita created the group");
  });

  it("lists added people naturally, however many there are", () => {
    expect(describeGroupEvent({ type: "MEMBERS_ADDED", members: [RAM] }, "Sita", false)).toBe(
      "Sita added Ram",
    );
    expect(
      describeGroupEvent({ type: "MEMBERS_ADDED", members: [RAM, SITA, HARI] }, "Ada", false),
    ).toBe("Ada added Ram, Sita and Hari");
  });

  it("describes renames, removals, leaving and admin changes", () => {
    expect(describeGroupEvent({ type: "GROUP_RENAMED", groupName: "Dashain" }, "Ada", false)).toBe(
      'Ada renamed the group to "Dashain"',
    );
    expect(describeGroupEvent({ type: "MEMBER_REMOVED", member: RAM }, "Ada", false)).toBe(
      "Ada removed Ram",
    );
    expect(describeGroupEvent({ type: "MEMBER_LEFT" }, "Ram", false)).toBe("Ram left");
    expect(describeGroupEvent({ type: "ADMIN_ASSIGNED", member: RAM }, "Ada", false)).toBe(
      "Ada made Ram an admin",
    );
    expect(describeGroupEvent({ type: "ADMIN_REMOVED", member: RAM }, "Ada", true)).toBe(
      "You removed Ram as an admin",
    );
  });
});
