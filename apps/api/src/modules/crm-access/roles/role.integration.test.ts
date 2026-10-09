import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import {
  addMembership,
  authHeaderFor,
  createStaffUser,
  makeSuperAdmin,
  seedOrganization,
} from "#test/integration/crm-access-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

import { BUILT_IN_ROLE_NAME } from "../crm-access.constants.js";

describe("Custom roles and organization settings", () => {
  const seedSuperAdminOrganization = async (label: string) => {
    const { organization, adminRole, memberRole } = await seedOrganization();
    const owner = await createStaffUser(`${label} Owner`);
    const ownerMembership = await addMembership(organization.id, owner.id, adminRole.id);
    await makeSuperAdmin(organization.id, ownerMembership.id);
    return { organization, owner, memberRole };
  };

  const host = (subdomain: string) => `${subdomain}.localhost`;

  it("creates a custom role from a subset of the permission catalog", async () => {
    const { organization, owner } = await seedSuperAdminOrganization("Role Create");

    const response = await request(testApp)
      .post("/api/crm/roles")
      .set("Authorization", authHeaderFor(owner.id))
      .set("Host", host(organization.subdomain))
      .send({ name: "Support agent", permissionKeys: ["tickets:read", "tickets:write"] });

    expect(response.status).toBe(201);
    expect(response.body.data.isBuiltIn).toBe(false);
    expect([...response.body.data.permissionKeys].sort()).toEqual([
      "tickets:read",
      "tickets:write",
    ]);

    const stored = await prisma.role.findFirstOrThrow({
      where: { organizationId: organization.id, name: "Support agent" },
      include: { permissions: true },
    });
    expect(stored.permissions.map((permission) => permission.permissionKey).sort()).toEqual([
      "tickets:read",
      "tickets:write",
    ]);
  });

  it("rejects a role that includes a withheld permission key", async () => {
    const { organization, owner } = await seedSuperAdminOrganization("Withheld Key");

    const response = await request(testApp)
      .post("/api/crm/roles")
      .set("Authorization", authHeaderFor(owner.id))
      .set("Host", host(organization.subdomain))
      .send({ name: "Sneaky", permissionKeys: ["tickets:read", "org:transfer_ownership"] });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_PERMISSION_KEYS");
  });

  it("rejects a duplicate role name off the database uniqueness constraint", async () => {
    const { organization, owner } = await seedSuperAdminOrganization("Duplicate Role");

    const first = await request(testApp)
      .post("/api/crm/roles")
      .set("Authorization", authHeaderFor(owner.id))
      .set("Host", host(organization.subdomain))
      .send({ name: "Analyst", permissionKeys: ["reports:read"] });
    expect(first.status).toBe(201);

    const second = await request(testApp)
      .post("/api/crm/roles")
      .set("Authorization", authHeaderFor(owner.id))
      .set("Host", host(organization.subdomain))
      .send({ name: "Analyst", permissionKeys: ["deals:read"] });

    expect(second.status).toBe(409);
    expect(second.body.code).toBe("ROLE_NAME_TAKEN");
  });

  it("replaces a custom role's permission set on update", async () => {
    const { organization, owner } = await seedSuperAdminOrganization("Role Update");

    const created = await request(testApp)
      .post("/api/crm/roles")
      .set("Authorization", authHeaderFor(owner.id))
      .set("Host", host(organization.subdomain))
      .send({ name: "Deal desk", permissionKeys: ["deals:read", "deals:write"] });

    const response = await request(testApp)
      .patch(`/api/crm/roles/${created.body.data.id}`)
      .set("Authorization", authHeaderFor(owner.id))
      .set("Host", host(organization.subdomain))
      .send({ permissionKeys: ["deals:read"] });

    expect(response.status).toBe(200);
    expect(response.body.data.permissionKeys).toEqual(["deals:read"]);

    const stored = await prisma.rolePermission.findMany({
      where: { roleId: created.body.data.id },
    });
    expect(stored.map((permission) => permission.permissionKey)).toEqual(["deals:read"]);
  });

  it("refuses to edit a built-in role", async () => {
    const { organization, owner } = await seedSuperAdminOrganization("Built-in Edit");
    const adminRole = await prisma.role.findFirstOrThrow({
      where: { organizationId: organization.id, name: BUILT_IN_ROLE_NAME.ADMIN },
    });

    const response = await request(testApp)
      .patch(`/api/crm/roles/${adminRole.id}`)
      .set("Authorization", authHeaderFor(owner.id))
      .set("Host", host(organization.subdomain))
      .send({ name: "Renamed admin" });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("ROLE_IS_BUILT_IN");
  });

  it("blocks deleting a custom role that still has members", async () => {
    const { organization, owner } = await seedSuperAdminOrganization("Role In Use");

    const created = await request(testApp)
      .post("/api/crm/roles")
      .set("Authorization", authHeaderFor(owner.id))
      .set("Host", host(organization.subdomain))
      .send({ name: "Occupied", permissionKeys: ["tickets:read"] });

    const teammate = await createStaffUser("Occupied Member");
    await addMembership(organization.id, teammate.id, created.body.data.id);

    const response = await request(testApp)
      .delete(`/api/crm/roles/${created.body.data.id}`)
      .set("Authorization", authHeaderFor(owner.id))
      .set("Host", host(organization.subdomain));

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("ROLE_IN_USE");
  });

  it("deletes an unused custom role", async () => {
    const { organization, owner } = await seedSuperAdminOrganization("Role Delete");

    const created = await request(testApp)
      .post("/api/crm/roles")
      .set("Authorization", authHeaderFor(owner.id))
      .set("Host", host(organization.subdomain))
      .send({ name: "Temporary", permissionKeys: ["tickets:read"] });

    const response = await request(testApp)
      .delete(`/api/crm/roles/${created.body.data.id}`)
      .set("Authorization", authHeaderFor(owner.id))
      .set("Host", host(organization.subdomain));

    expect(response.status).toBe(200);
    expect(await prisma.role.findUnique({ where: { id: created.body.data.id } })).toBeNull();
  });

  it("denies role mutation to a member without roles:manage", async () => {
    const { organization, memberRole } = await seedSuperAdminOrganization("Role Perm Gate");
    const teammate = await createStaffUser("Plain Member");
    await addMembership(organization.id, teammate.id, memberRole.id);

    const response = await request(testApp)
      .post("/api/crm/roles")
      .set("Authorization", authHeaderFor(teammate.id))
      .set("Host", host(organization.subdomain))
      .send({ name: "Nope", permissionKeys: ["tickets:read"] });

    expect(response.status).toBe(403);
  });

  it("renames the organization", async () => {
    const { organization, owner } = await seedSuperAdminOrganization("Org Rename");

    const response = await request(testApp)
      .patch("/api/crm/organization")
      .set("Authorization", authHeaderFor(owner.id))
      .set("Host", host(organization.subdomain))
      .send({ name: "Renamed Org Co" });

    expect(response.status).toBe(200);
    const stored = await prisma.organization.findUniqueOrThrow({ where: { id: organization.id } });
    expect(stored.name).toBe("Renamed Org Co");
  });
});
