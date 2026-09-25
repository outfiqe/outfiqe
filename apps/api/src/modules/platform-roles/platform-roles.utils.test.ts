import { describe, expect, it } from "vitest";

import {
  findUnselectablePlatformPermissionKeys,
  withoutPlatformAccessKey,
  withPlatformAccessKey,
  withPlatformAccessKeyOnPermissionChange,
} from "./platform-roles.utils.js";

const buildRole = (permissionKeys: string[]) => ({
  id: "role-id",
  organizationId: "organization-id",
  name: "Support only",
  isBuiltIn: false,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  permissionKeys,
});

describe("findUnselectablePlatformPermissionKeys", () => {
  it("flags the system-managed platform:access key and CRM keys", () => {
    expect(
      findUnselectablePlatformPermissionKeys([
        "platform:support:read",
        "platform:access",
        "tickets:read",
      ]),
    ).toEqual(["platform:access", "tickets:read"]);
  });
});

describe("withPlatformAccessKey", () => {
  it("appends platform:access to the chosen permissions", () => {
    expect(withPlatformAccessKey(["platform:support:read"])).toEqual([
      "platform:support:read",
      "platform:access",
    ]);
  });

  it("does not duplicate platform:access when it is already present", () => {
    expect(withPlatformAccessKey(["platform:access", "platform:support:read"])).toEqual([
      "platform:access",
      "platform:support:read",
    ]);
  });
});

describe("withPlatformAccessKeyOnPermissionChange", () => {
  it("leaves a rename-only update untouched", () => {
    const renameOnly = { name: "Renamed" };

    expect(withPlatformAccessKeyOnPermissionChange(renameOnly)).toBe(renameOnly);
  });

  it("adds platform:access when the permissions are being replaced", () => {
    expect(
      withPlatformAccessKeyOnPermissionChange({ permissionKeys: ["platform:support:read"] }),
    ).toEqual({ permissionKeys: ["platform:support:read", "platform:access"] });
  });
});

describe("withoutPlatformAccessKey", () => {
  it("hides platform:access from a role's permissions and keeps everything else", () => {
    const role = buildRole(["platform:support:read", "platform:access"]);

    expect(withoutPlatformAccessKey(role).permissionKeys).toEqual(["platform:support:read"]);
  });
});
