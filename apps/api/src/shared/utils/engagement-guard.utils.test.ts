import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserRole } from "#generated/prisma/enums.js";

import { assertCanEngage } from "./engagement-guard.utils.js";

const { findUserById } = vi.hoisted(() => ({ findUserById: vi.fn() }));

vi.mock("#modules/users/user.repository.js", () => ({
  userRepository: { findById: findUserById },
}));

const USER_ID = "user-id";

const mockAccountWithRole = (role: UserRole) => {
  findUserById.mockResolvedValue({ id: USER_ID, role });
};

describe("assertCanEngage", () => {
  beforeEach(() => {
    findUserById.mockReset();
  });

  it("lets shoppers and brand owners engage", async () => {
    mockAccountWithRole(UserRole.CUSTOMER);
    await expect(assertCanEngage(USER_ID)).resolves.toBeUndefined();

    mockAccountWithRole(UserRole.BRAND_OWNER);
    await expect(assertCanEngage(USER_ID)).resolves.toBeUndefined();
  });

  it("blocks platform staff", async () => {
    mockAccountWithRole(UserRole.ADMIN);

    await expect(assertCanEngage(USER_ID)).rejects.toMatchObject({
      code: "ADMIN_CANNOT_ENGAGE",
      status: 403,
    });
  });

  it("blocks tenant staff", async () => {
    mockAccountWithRole(UserRole.TENANT_STAFF);

    await expect(assertCanEngage(USER_ID)).rejects.toMatchObject({
      code: "ADMIN_CANNOT_ENGAGE",
      status: 403,
    });
  });

  it("uses the caller's own code and message when provided", async () => {
    mockAccountWithRole(UserRole.TENANT_STAFF);

    await expect(
      assertCanEngage(USER_ID, { code: "STAFF_CANNOT_FOLLOW", message: "No following." }),
    ).rejects.toMatchObject({ code: "STAFF_CANNOT_FOLLOW", message: "No following." });
  });
});
