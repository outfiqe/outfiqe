import { mswServer } from "@test/integration/msw/server";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { type ContactInput, crmContactsApi } from "./contactsApi";

const API_BASE = "http://localhost:3000/api";
const ok = (data: unknown) => HttpResponse.json({ success: true, data });

const contact = {
  id: "c1",
  organizationId: "o1",
  name: "Aasha Rai",
  email: "aasha@example.com",
  phone: null,
  company: "Kastha",
  jobTitle: "Founder",
  lifecycleStage: "CUSTOMER" as const,
  source: "referral",
  tags: ["vip"],
  notes: null,
  linkedUserId: null,
  ownerMembershipId: "m1",
  ownerName: "Sabin",
  linkedUserName: null,
  linkedUserHandle: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

const input: ContactInput = {
  name: "Aasha Rai",
  email: "aasha@example.com",
  phone: null,
  company: "Kastha",
  jobTitle: "Founder",
  lifecycleStage: "CUSTOMER",
  source: "referral",
  tags: ["vip"],
  notes: null,
  ownerMembershipId: "m1",
};

describe("crmContactsApi", () => {
  it("passes only the set filters as query params when listing", async () => {
    let url: URL | undefined;
    mswServer.use(
      http.get(`${API_BASE}/crm/contacts`, ({ request }) => {
        url = new URL(request.url);
        return ok({ items: [contact], total: 1, hasMore: false });
      }),
    );

    const page = await crmContactsApi.listContacts({ q: "aasha", page: 2 });

    expect(page.items).toHaveLength(1);
    expect(url?.searchParams.get("q")).toBe("aasha");
    expect(url?.searchParams.get("page")).toBe("2");
    expect(url?.searchParams.has("lifecycleStage")).toBe(false);
    expect(url?.searchParams.has("pageSize")).toBe(false);
  });

  it("lists with no filters at all", async () => {
    let url: URL | undefined;
    mswServer.use(
      http.get(`${API_BASE}/crm/contacts`, ({ request }) => {
        url = new URL(request.url);
        return ok({ items: [], total: 0, hasMore: false });
      }),
    );

    await crmContactsApi.listContacts();

    expect([...(url?.searchParams.keys() ?? [])]).toEqual([]);
  });

  it("fetches, creates, updates and deletes a single contact", async () => {
    let patchBody: unknown;
    let deleted = false;
    mswServer.use(
      http.get(`${API_BASE}/crm/contacts/c1`, () => ok(contact)),
      http.post(`${API_BASE}/crm/contacts`, () => ok({ ...contact, id: "c2" })),
      http.patch(`${API_BASE}/crm/contacts/c1`, async ({ request }) => {
        patchBody = await request.json();
        return ok({ ...contact, jobTitle: "CEO" });
      }),
      http.delete(`${API_BASE}/crm/contacts/c1`, () => {
        deleted = true;
        return ok(null);
      }),
    );

    expect((await crmContactsApi.getContact("c1")).name).toBe("Aasha Rai");
    expect((await crmContactsApi.createContact(input)).id).toBe("c2");
    expect((await crmContactsApi.updateContact("c1", { jobTitle: "CEO" })).jobTitle).toBe("CEO");
    expect(patchBody).toEqual({ jobTitle: "CEO" });

    await crmContactsApi.deleteContact("c1");
    expect(deleted).toBe(true);
  });
});
