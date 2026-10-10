import type { Notification } from "@outfiqe/types";
import { NotificationType } from "@outfiqe/types";
import { describe, expect, it } from "vitest";

import { belongsToTenant, toSameOriginAdminHref } from "./adminNotificationBell.utils";

const TENANT_ORIGIN = "https://acme.outfiqe.com";

const aNotification = (organizationId: string | null): Notification => ({
  id: "n1",
  recipientId: "r1",
  actorId: null,
  type: NotificationType.CRM_ITEM_ASSIGNED,
  entityType: null,
  entityId: null,
  targetSurface: null,
  targetPath: null,
  organizationId,
  metadata: {},
  groupKey: null,
  actorCount: 1,
  isRead: false,
  readAt: null,
  createdAt: "2026-09-26T00:00:00.000Z",
  updatedAt: "2026-09-26T00:00:00.000Z",
});

describe("toSameOriginAdminHref", () => {
  it("turns a link into this tenant's admin into an in-app path", () => {
    expect(toSameOriginAdminHref(`${TENANT_ORIGIN}/admin/crm/tasks`, TENANT_ORIGIN)).toBe(
      "/crm/tasks",
    );
  });

  it("keeps the query string and fragment", () => {
    expect(
      toSameOriginAdminHref(`${TENANT_ORIGIN}/admin/crm/support?ticket=7#reply`, TENANT_ORIGIN),
    ).toBe("/crm/support?ticket=7#reply");
  });

  it("maps the bare admin root to the app root", () => {
    expect(toSameOriginAdminHref(`${TENANT_ORIGIN}/admin`, TENANT_ORIGIN)).toBe("/");
  });

  it("leaves a link to another tenant alone", () => {
    expect(toSameOriginAdminHref("https://globex.outfiqe.com/admin/crm/tasks", TENANT_ORIGIN)).toBe(
      null,
    );
  });

  it("leaves a same-origin link outside the admin app alone", () => {
    expect(toSameOriginAdminHref(`${TENANT_ORIGIN}/administrator`, TENANT_ORIGIN)).toBe(null);
  });
});

describe("belongsToTenant", () => {
  it("accepts a notification from this tenant", () => {
    expect(belongsToTenant("org-acme")(aNotification("org-acme"))).toBe(true);
  });

  it("rejects a notification from another tenant", () => {
    expect(belongsToTenant("org-acme")(aNotification("org-globex"))).toBe(false);
  });

  it("rejects a notification that belongs to no tenant", () => {
    expect(belongsToTenant("org-acme")(aNotification(null))).toBe(false);
  });

  it("rejects everything until the tenant is known", () => {
    expect(belongsToTenant(undefined)(aNotification(null))).toBe(false);
  });
});
