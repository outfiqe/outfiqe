import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { FulfilmentStatus } from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import { createAdminSession } from "#test/integration/auth-helpers.js";
import { createBuyer, createOrder } from "#test/integration/order-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

beforeEach(async () => {
  await redis.flushdb();
});

describe("PATCH /api/orders/admin/:orderId/fulfilment", () => {
  it("returns 404 for an unknown order id", async () => {
    const { authHeader } = await createAdminSession();

    const response = await request(testApp)
      .patch(`/api/orders/admin/${randomUUID()}/fulfilment`)
      .set("Authorization", authHeader)
      .send({ status: FulfilmentStatus.PACKED });

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("NOT_FOUND");
  });

  it("advances a placed order to packed", async () => {
    const { authHeader } = await createAdminSession();
    const buyer = await createBuyer();
    const order = await createOrder(buyer.id);

    const response = await request(testApp)
      .patch(`/api/orders/admin/${order.id}/fulfilment`)
      .set("Authorization", authHeader)
      .send({ status: FulfilmentStatus.PACKED });

    expect(response.status).toBe(200);

    const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(updated.fulfilmentStatus).toBe(FulfilmentStatus.PACKED);
  });

  it("rejects an invalid transition", async () => {
    const { authHeader } = await createAdminSession();
    const buyer = await createBuyer();
    const order = await createOrder(buyer.id, FulfilmentStatus.PLACED);

    const response = await request(testApp)
      .patch(`/api/orders/admin/${order.id}/fulfilment`)
      .set("Authorization", authHeader)
      .send({ status: FulfilmentStatus.DELIVERED });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("INVALID_TRANSITION");
  });
});

describe("GET /api/orders/admin search", () => {
  const searchOrders = (authHeader: string, query: Record<string, string>) =>
    request(testApp).get("/api/orders/admin").query(query).set("Authorization", authHeader);

  const listedIds = (response: request.Response): string[] =>
    response.body.data.orders.map((listedOrder: { id: string }) => listedOrder.id);

  it.each([
    { label: "with a hash", toTerm: (orderId: string) => `#${orderId.slice(0, 8).toUpperCase()}` },
    { label: "without a hash", toTerm: (orderId: string) => orderId.slice(0, 8).toUpperCase() },
    { label: "in lowercase", toTerm: (orderId: string) => orderId.slice(0, 8) },
    { label: "as a full order id", toTerm: (orderId: string) => orderId },
  ])("finds an order by its reference $label", async ({ toTerm }) => {
    const { authHeader } = await createAdminSession();
    const buyer = await createBuyer();
    const wantedOrder = await createOrder(buyer.id);
    await createOrder(buyer.id);

    const response = await searchOrders(authHeader, { search: toTerm(wantedOrder.id) });

    expect(response.status).toBe(200);
    expect(listedIds(response)).toContain(wantedOrder.id);
    const unrelatedMatches = listedIds(response).filter(
      (orderId) => !orderId.startsWith(wantedOrder.id.slice(0, 8)),
    );
    expect(unrelatedMatches).toEqual([]);
  });

  it("finds a buyer's orders by email and by phone", async () => {
    const { authHeader } = await createAdminSession();
    const buyer = await createBuyer();
    const buyerOrder = await createOrder(buyer.id);
    await createOrder((await createBuyer()).id);

    const byEmail = await searchOrders(authHeader, { search: buyer.email });
    const byPhone = await searchOrders(authHeader, { search: `+977${buyer.phone}` });

    expect(listedIds(byEmail)).toEqual([buyerOrder.id]);
    expect(listedIds(byPhone)).toEqual([buyerOrder.id]);
  });

  it("returns an empty page when nothing matches", async () => {
    const { authHeader } = await createAdminSession();

    const response = await searchOrders(authHeader, { search: "#00000000" });

    expect(response.status).toBe(200);
    expect(response.body.data.orders).toEqual([]);
    expect(response.body.data.nextCursor).toBeNull();
  });

  it("combines the search with the status filter", async () => {
    const { authHeader } = await createAdminSession();
    const buyer = await createBuyer();
    const placedOrder = await createOrder(buyer.id, FulfilmentStatus.PLACED);

    const matchingStatus = await searchOrders(authHeader, {
      search: buyer.email,
      status: FulfilmentStatus.PLACED,
    });
    const otherStatus = await searchOrders(authHeader, {
      search: buyer.email,
      status: FulfilmentStatus.CANCELLED,
    });

    expect(listedIds(matchingStatus)).toEqual([placedOrder.id]);
    expect(listedIds(otherStatus)).toEqual([]);
  });

  it("pages through search matches with the cursor", async () => {
    const { authHeader } = await createAdminSession();
    const buyer = await createBuyer();
    const firstOrder = await createOrder(buyer.id);
    const secondOrder = await createOrder(buyer.id);

    const firstPage = await searchOrders(authHeader, { search: buyer.email, limit: "1" });
    const secondPage = await searchOrders(authHeader, {
      search: buyer.email,
      limit: "1",
      cursor: firstPage.body.data.nextCursor,
    });

    expect([...listedIds(firstPage), ...listedIds(secondPage)].sort()).toEqual(
      [firstOrder.id, secondOrder.id].sort(),
    );
    expect(secondPage.body.data.nextCursor).toBeNull();
  });
});
