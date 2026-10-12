import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { prisma } from "#db/prisma.js";
import { eventBus } from "#events/event-bus.js";
import {
  addMembership,
  authHeaderFor,
  createStaffUser,
  makeSuperAdmin,
  seedOrganization,
} from "#test/integration/crm-access-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

describe("Ownership transfer", () => {
  it("moves superAdminMembershipId once the recipient accepts", async () => {
    const { organization, adminRole, memberRole } = await seedOrganization();
    const owner = await createStaffUser("Original Owner");
    const ownerMembership = await addMembership(organization.id, owner.id, adminRole.id);
    await makeSuperAdmin(organization.id, ownerMembership.id);

    const recipient = await createStaffUser("Ownership Recipient");
    const recipientMembership = await addMembership(organization.id, recipient.id, memberRole.id);

    const createResponse = await request(testApp)
      .post("/api/crm/ownership-transfer")
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(owner.id))
      .send({ toMembershipId: recipientMembership.id });
    expect(createResponse.status).toBe(201);

    const pendingRequest = await prisma.ownershipTransferRequest.findFirstOrThrow({
      where: { organizationId: organization.id },
    });

    const acceptResponse = await request(testApp)
      .post(`/api/crm/ownership-transfer/${pendingRequest.id}/accept`)
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(recipient.id));
    expect(acceptResponse.status).toBe(200);

    const updatedOrganization = await prisma.organization.findUniqueOrThrow({
      where: { id: organization.id },
    });
    expect(updatedOrganization.superAdminMembershipId).toBe(recipientMembership.id);

    const previousOwnerMembership = await prisma.membership.findUniqueOrThrow({
      where: { id: ownerMembership.id },
    });
    expect(previousOwnerMembership.roleId).toBe(adminRole.id);
  });

  it("removes the previous owner's membership once accepted when removeSenderMembership is set", async () => {
    const { organization, adminRole, memberRole } = await seedOrganization();
    const owner = await createStaffUser("Owner Removing Own Access");
    const ownerMembership = await addMembership(organization.id, owner.id, adminRole.id);
    await makeSuperAdmin(organization.id, ownerMembership.id);

    const recipient = await createStaffUser("Recipient Of Full Handoff");
    const recipientMembership = await addMembership(organization.id, recipient.id, memberRole.id);

    const createResponse = await request(testApp)
      .post("/api/crm/ownership-transfer")
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(owner.id))
      .send({ toMembershipId: recipientMembership.id, removeSenderMembership: true });
    expect(createResponse.status).toBe(201);

    const pendingRequest = await prisma.ownershipTransferRequest.findFirstOrThrow({
      where: { organizationId: organization.id },
    });
    expect(pendingRequest.removeSenderMembershipOnAccept).toBe(true);

    const publishSpy = vi.spyOn(eventBus, "publish").mockResolvedValue(undefined);
    const acceptResponse = await request(testApp)
      .post(`/api/crm/ownership-transfer/${pendingRequest.id}/accept`)
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(recipient.id));
    expect(acceptResponse.status).toBe(200);

    const updatedOrganization = await prisma.organization.findUniqueOrThrow({
      where: { id: organization.id },
    });
    expect(updatedOrganization.superAdminMembershipId).toBe(recipientMembership.id);

    const previousOwnerMembership = await prisma.membership.findUnique({
      where: { id: ownerMembership.id },
    });
    expect(previousOwnerMembership).toBeNull();
    expect(publishSpy).toHaveBeenCalledWith("crm.membership.ended", {
      organizationId: organization.id,
      userId: owner.id,
    });
    publishSpy.mockRestore();
  });

  it("rejects a non-SUPERADMIN member trying to create a transfer", async () => {
    const { organization, memberRole } = await seedOrganization();
    const staff = await createStaffUser("Regular Member Attempting Transfer");
    await addMembership(organization.id, staff.id, memberRole.id);

    const otherMember = await createStaffUser("Other Member");
    const otherMembership = await addMembership(organization.id, otherMember.id, memberRole.id);

    const response = await request(testApp)
      .post("/api/crm/ownership-transfer")
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(staff.id))
      .send({ toMembershipId: otherMembership.id });

    expect(response.status).toBe(403);
  });

  it("rejects creating a second transfer while one is already pending", async () => {
    const { organization, adminRole, memberRole } = await seedOrganization();
    const owner = await createStaffUser("Owner With Pending Transfer");
    const ownerMembership = await addMembership(organization.id, owner.id, adminRole.id);
    await makeSuperAdmin(organization.id, ownerMembership.id);

    const firstRecipient = await createStaffUser("First Recipient");
    const firstMembership = await addMembership(organization.id, firstRecipient.id, memberRole.id);
    const secondRecipient = await createStaffUser("Second Recipient");
    const secondMembership = await addMembership(
      organization.id,
      secondRecipient.id,
      memberRole.id,
    );

    await request(testApp)
      .post("/api/crm/ownership-transfer")
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(owner.id))
      .send({ toMembershipId: firstMembership.id });

    const response = await request(testApp)
      .post("/api/crm/ownership-transfer")
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(owner.id))
      .send({ toMembershipId: secondMembership.id });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("TRANSFER_ALREADY_PENDING");
  });

  it("rejects a user other than the recipient trying to accept or decline", async () => {
    const { organization, adminRole, memberRole } = await seedOrganization();
    const owner = await createStaffUser("Owner For Mismatch Test");
    const ownerMembership = await addMembership(organization.id, owner.id, adminRole.id);
    await makeSuperAdmin(organization.id, ownerMembership.id);

    const recipient = await createStaffUser("Intended Recipient");
    const recipientMembership = await addMembership(organization.id, recipient.id, memberRole.id);
    const bystander = await createStaffUser("Unrelated Bystander");
    await addMembership(organization.id, bystander.id, memberRole.id);

    await request(testApp)
      .post("/api/crm/ownership-transfer")
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(owner.id))
      .send({ toMembershipId: recipientMembership.id });

    const pendingRequest = await prisma.ownershipTransferRequest.findFirstOrThrow({
      where: { organizationId: organization.id },
    });

    const acceptResponse = await request(testApp)
      .post(`/api/crm/ownership-transfer/${pendingRequest.id}/accept`)
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(bystander.id));
    expect(acceptResponse.status).toBe(403);

    const declineResponse = await request(testApp)
      .post(`/api/crm/ownership-transfer/${pendingRequest.id}/decline`)
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(bystander.id));
    expect(declineResponse.status).toBe(403);
  });

  it("stops a revoked transfer from being acceptable", async () => {
    const { organization, adminRole, memberRole } = await seedOrganization();
    const owner = await createStaffUser("Owner Who Revokes");
    const ownerMembership = await addMembership(organization.id, owner.id, adminRole.id);
    await makeSuperAdmin(organization.id, ownerMembership.id);

    const recipient = await createStaffUser("Recipient Of Revoked Transfer");
    const recipientMembership = await addMembership(organization.id, recipient.id, memberRole.id);

    await request(testApp)
      .post("/api/crm/ownership-transfer")
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(owner.id))
      .send({ toMembershipId: recipientMembership.id });

    const pendingRequest = await prisma.ownershipTransferRequest.findFirstOrThrow({
      where: { organizationId: organization.id },
    });

    const revokeResponse = await request(testApp)
      .delete(`/api/crm/ownership-transfer/${pendingRequest.id}`)
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(owner.id));
    expect(revokeResponse.status).toBe(200);

    const acceptResponse = await request(testApp)
      .post(`/api/crm/ownership-transfer/${pendingRequest.id}/accept`)
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(recipient.id));
    expect(acceptResponse.status).toBe(409);
    expect(acceptResponse.body.code).toBe("TRANSFER_INVALID");
  });

  it("rejects transferring ownership to a deactivated membership", async () => {
    const { organization, adminRole, memberRole } = await seedOrganization();
    const owner = await createStaffUser("Owner Targeting Deactivated Member");
    const ownerMembership = await addMembership(organization.id, owner.id, adminRole.id);
    await makeSuperAdmin(organization.id, ownerMembership.id);

    const deactivatedMember = await createStaffUser("Deactivated Target");
    const deactivatedMembership = await addMembership(
      organization.id,
      deactivatedMember.id,
      memberRole.id,
      "DEACTIVATED",
    );

    const response = await request(testApp)
      .post("/api/crm/ownership-transfer")
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(owner.id))
      .send({ toMembershipId: deactivatedMembership.id });

    expect(response.status).toBe(404);
  });

  it("rejects transferring ownership to yourself", async () => {
    const { organization, adminRole } = await seedOrganization();
    const owner = await createStaffUser("Owner Transferring To Self");
    const ownerMembership = await addMembership(organization.id, owner.id, adminRole.id);
    await makeSuperAdmin(organization.id, ownerMembership.id);

    const response = await request(testApp)
      .post("/api/crm/ownership-transfer")
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(owner.id))
      .send({ toMembershipId: ownerMembership.id });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("TRANSFER_SELF");
  });
});
