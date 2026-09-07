import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { FulfilmentStatus, PaymentMethod, ProductStatus } from "#generated/prisma/enums.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { redis } from "#redis/redis.client.js";
import { createAdminSession } from "#test/integration/authHelpers.js";
import { ensureProductType } from "#test/integration/productFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

beforeEach(async () => {
  await redis.flushdb();
});

const createUser = async (name: string, handle: string) =>
  prisma.user.create({
    data: {
      email: `${handle}-${randomUUID()}@outfiqe.test`,
      name,
      handle: `${handle}-${randomUUID().slice(0, 6)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
    },
  });

const createProduct = async (name: string) => {
  const brand = await prisma.brand.create({
    data: {
      name: `${name} Brand`,
      contactName: "Brand Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  const product = await prisma.product.create({
    data: {
      brandId: brand.id,
      name,
      price: 1000,
      productTypeId: await ensureProductType(),
      status: ProductStatus.APPROVED,
    },
  });
  const size = await prisma.productSize.create({
    data: { productId: product.id, label: "M", stock: 10 },
  });
  return { product, brand, size };
};

const createDeliveredOrderItem = async (
  userId: string,
  productId: string,
  sizeId: string,
): Promise<void> => {
  await prisma.order.create({
    data: {
      userId,
      fullName: "Test Buyer",
      phone: "9800000000",
      address: "123 Test Street",
      city: "Kathmandu",
      paymentMethod: PaymentMethod.COD,
      fulfilmentStatus: FulfilmentStatus.DELIVERED,
      subtotal: 1000,
      deliveryFee: 100,
      total: 1100,
      items: { create: [{ productId, sizeId, qty: 1, unitPrice: 1000, listUnitPrice: 1000 }] },
    },
  });
};

const authHeaderFor = (userId: string, role: UserRole = UserRole.CUSTOMER) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};

describe("POST /api/products/:productId/reviews", () => {
  it("rejects a review from a user who hasn't received the product", async () => {
    const { product } = await createProduct("Unpurchased Jacket");
    const shopper = await createUser("Not A Buyer", "not-a-buyer");

    const response = await request(testApp)
      .post(`/api/products/${product.id}/reviews`)
      .set("Authorization", authHeaderFor(shopper.id))
      .send({ rating: 5, body: "Never actually bought this." });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("PURCHASE_REQUIRED");
  });

  it("lets a verified buyer post a review and updates the product's rating summary", async () => {
    const { product, size } = await createProduct("Verified Jacket");
    const buyer = await createUser("Real Buyer", "real-buyer");
    await createDeliveredOrderItem(buyer.id, product.id, size.id);

    const response = await request(testApp)
      .post(`/api/products/${product.id}/reviews`)
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ rating: 4, title: "Great fit", body: "Runs true to size, fabric feels premium." });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      rating: 4,
      title: "Great fit",
      author: { id: buyer.id },
      helpfulCount: 0,
    });

    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(updatedProduct.reviewCount).toBe(1);
    expect(updatedProduct.avgRating).toBe(4);
    expect(updatedProduct.rating4Count).toBe(1);
  });

  it("rejects a second review from the same buyer on the same product", async () => {
    const { product, size } = await createProduct("Double Review Jacket");
    const buyer = await createUser("Repeat Buyer", "repeat-buyer");
    await createDeliveredOrderItem(buyer.id, product.id, size.id);

    await request(testApp)
      .post(`/api/products/${product.id}/reviews`)
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ rating: 5, body: "Loved it, first review." });

    const secondAttempt = await request(testApp)
      .post(`/api/products/${product.id}/reviews`)
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ rating: 2, body: "Trying to sneak in a second review." });

    expect(secondAttempt.status).toBe(409);
    expect(secondAttempt.body.code).toBe("REVIEW_ALREADY_EXISTS");
  });

  it("lets exactly one review through when the same buyer submits concurrently", async () => {
    const { product, size } = await createProduct("Concurrent Review Jacket");
    const buyer = await createUser("Concurrent Buyer", "concurrent-buyer");
    await createDeliveredOrderItem(buyer.id, product.id, size.id);

    const submitReview = () =>
      request(testApp)
        .post(`/api/products/${product.id}/reviews`)
        .set("Authorization", authHeaderFor(buyer.id))
        .send({ rating: 4, body: "Racing to be the first review on this one." });

    const [first, second] = await Promise.all([submitReview(), submitReview()]);
    const statuses = [first.status, second.status].sort();

    expect(statuses).toEqual([201, 409]);
    const conflictResponse = first.status === 409 ? first : second;
    expect(conflictResponse.body.code).toBe("REVIEW_ALREADY_EXISTS");

    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(updatedProduct.reviewCount).toBe(1);
  });
});

const postReview = async (
  productId: string,
  buyerId: string,
  overrides: Record<string, unknown> = {},
) => {
  const response = await request(testApp)
    .post(`/api/products/${productId}/reviews`)
    .set("Authorization", authHeaderFor(buyerId))
    .send({ rating: 4, body: "A perfectly ordinary review.", ...overrides });
  return response.body.data.id as string;
};

describe("PATCH /api/products/:productId/reviews/:reviewId", () => {
  it("lets the author update their own review and recomputes the rating summary", async () => {
    const { product, size } = await createProduct("Editable Jacket");
    const buyer = await createUser("Editing Buyer", "editing-buyer");
    await createDeliveredOrderItem(buyer.id, product.id, size.id);
    const reviewId = await postReview(product.id, buyer.id, { rating: 3 });

    const response = await request(testApp)
      .patch(`/api/products/${product.id}/reviews/${reviewId}`)
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ rating: 5, body: "Actually, on reflection, this is great." });

    expect(response.status).toBe(200);
    expect(response.body.data.rating).toBe(5);

    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(updatedProduct.avgRating).toBe(5);
  });

  it("forbids editing someone else's review", async () => {
    const { product, size } = await createProduct("Contested Jacket");
    const buyer = await createUser("Original Author", "original-author");
    await createDeliveredOrderItem(buyer.id, product.id, size.id);
    const reviewId = await postReview(product.id, buyer.id);
    const outsider = await createUser("Outsider", "outsider-editor");

    const response = await request(testApp)
      .patch(`/api/products/${product.id}/reviews/${reviewId}`)
      .set("Authorization", authHeaderFor(outsider.id))
      .send({ rating: 1, body: "Trying to sabotage someone else's review." });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("FORBIDDEN");
  });

  it("returns 404 for a review that doesn't exist", async () => {
    const { product } = await createProduct("Nonexistent Review Jacket");
    const buyer = await createUser("Confused Buyer", "confused-buyer");

    const response = await request(testApp)
      .patch(`/api/products/${product.id}/reviews/${randomUUID()}`)
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ rating: 3, body: "Editing a review that was never created." });

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("REVIEW_NOT_FOUND");
  });
});

describe("POST/DELETE /api/products/:productId/reviews/:reviewId/helpful", () => {
  it("marks another user's review helpful", async () => {
    const { product, size } = await createProduct("Helpful Jacket");
    const author = await createUser("Review Author", "review-author");
    await createDeliveredOrderItem(author.id, product.id, size.id);
    const reviewId = await postReview(product.id, author.id);
    const voter = await createUser("Helpful Voter", "helpful-voter");

    const response = await request(testApp)
      .post(`/api/products/${product.id}/reviews/${reviewId}/helpful`)
      .set("Authorization", authHeaderFor(voter.id));

    expect(response.status).toBe(200);
    expect(response.body.data.helpfulCount).toBe(1);
  });

  it("is idempotent when the same user votes twice", async () => {
    const { product, size } = await createProduct("Double Vote Jacket");
    const author = await createUser("Review Author", "review-author-2");
    await createDeliveredOrderItem(author.id, product.id, size.id);
    const reviewId = await postReview(product.id, author.id);
    const voter = await createUser("Repeat Voter", "repeat-voter");

    await request(testApp)
      .post(`/api/products/${product.id}/reviews/${reviewId}/helpful`)
      .set("Authorization", authHeaderFor(voter.id));
    const second = await request(testApp)
      .post(`/api/products/${product.id}/reviews/${reviewId}/helpful`)
      .set("Authorization", authHeaderFor(voter.id));

    expect(second.status).toBe(200);
    expect(second.body.data.helpfulCount).toBe(1);
  });

  it("rejects marking your own review as helpful", async () => {
    const { product, size } = await createProduct("Self Vote Jacket");
    const author = await createUser("Self Voter", "self-voter");
    await createDeliveredOrderItem(author.id, product.id, size.id);
    const reviewId = await postReview(product.id, author.id);

    const response = await request(testApp)
      .post(`/api/products/${product.id}/reviews/${reviewId}/helpful`)
      .set("Authorization", authHeaderFor(author.id));

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("CANNOT_VOTE_OWN_REVIEW");
  });

  it("removes a helpful vote", async () => {
    const { product, size } = await createProduct("Unvote Jacket");
    const author = await createUser("Review Author", "review-author-3");
    await createDeliveredOrderItem(author.id, product.id, size.id);
    const reviewId = await postReview(product.id, author.id);
    const voter = await createUser("Unvoting Voter", "unvoting-voter");

    await request(testApp)
      .post(`/api/products/${product.id}/reviews/${reviewId}/helpful`)
      .set("Authorization", authHeaderFor(voter.id));

    const response = await request(testApp)
      .delete(`/api/products/${product.id}/reviews/${reviewId}/helpful`)
      .set("Authorization", authHeaderFor(voter.id));

    expect(response.status).toBe(200);
    expect(response.body.data.helpfulCount).toBe(0);
  });

  it("is a no-op when removing a vote that was never cast", async () => {
    const { product, size } = await createProduct("Never Voted Jacket");
    const author = await createUser("Review Author", "review-author-4");
    await createDeliveredOrderItem(author.id, product.id, size.id);
    const reviewId = await postReview(product.id, author.id);
    const nonVoter = await createUser("Never Voted", "never-voted");

    const response = await request(testApp)
      .delete(`/api/products/${product.id}/reviews/${reviewId}/helpful`)
      .set("Authorization", authHeaderFor(nonVoter.id));

    expect(response.status).toBe(200);
    expect(response.body.data.helpfulCount).toBe(0);
  });
});

describe("GET /api/products/:productId/reviews", () => {
  it("sorts by highest rating and reports hasVotedHelpful for the viewer", async () => {
    const { product, size } = await createProduct("Sorted Reviews Jacket");
    const buyerA = await createUser("Buyer A", "buyer-a");
    const buyerB = await createUser("Buyer B", "buyer-b");
    await createDeliveredOrderItem(buyerA.id, product.id, size.id);
    await createDeliveredOrderItem(buyerB.id, product.id, size.id);

    const lowReview = await request(testApp)
      .post(`/api/products/${product.id}/reviews`)
      .set("Authorization", authHeaderFor(buyerA.id))
      .send({ rating: 2, body: "It was okay, not amazing." });
    await request(testApp)
      .post(`/api/products/${product.id}/reviews`)
      .set("Authorization", authHeaderFor(buyerB.id))
      .send({ rating: 5, body: "Absolutely loved this piece." });

    await request(testApp)
      .post(`/api/products/${product.id}/reviews/${lowReview.body.data.id}/helpful`)
      .set("Authorization", authHeaderFor(buyerB.id));

    const response = await request(testApp)
      .get(`/api/products/${product.id}/reviews`)
      .query({ sort: "highest_rating" })
      .set("Authorization", authHeaderFor(buyerB.id));

    expect(response.status).toBe(200);
    expect(response.body.data.reviews.map((review: { rating: number }) => review.rating)).toEqual([
      5, 2,
    ]);
    const votedReview = response.body.data.reviews.find(
      (review: { id: string }) => review.id === lowReview.body.data.id,
    );
    expect(votedReview.helpfulCount).toBe(1);
    expect(votedReview.hasVotedHelpful).toBe(true);
  });
});

describe("DELETE /api/products/:productId/reviews/:reviewId", () => {
  it("lets the review's author delete it and recomputes the rating summary", async () => {
    const { product, size } = await createProduct("Own Review Jacket");
    const buyer = await createUser("Own Reviewer", "own-reviewer");
    await createDeliveredOrderItem(buyer.id, product.id, size.id);

    const created = await request(testApp)
      .post(`/api/products/${product.id}/reviews`)
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ rating: 3, body: "Neutral first impression." });

    const response = await request(testApp)
      .delete(`/api/products/${product.id}/reviews/${created.body.data.id}`)
      .set("Authorization", authHeaderFor(buyer.id));

    expect(response.status).toBe(200);
    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(updatedProduct.reviewCount).toBe(0);
    expect(updatedProduct.avgRating).toBeNull();
  });

  it("forbids a different customer from deleting someone else's review", async () => {
    const { product, size } = await createProduct("Protected Review Jacket");
    const buyer = await createUser("Original Reviewer", "original-reviewer");
    const stranger = await createUser("Stranger", "stranger");
    await createDeliveredOrderItem(buyer.id, product.id, size.id);

    const created = await request(testApp)
      .post(`/api/products/${product.id}/reviews`)
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ rating: 5, body: "Someone else's honest opinion." });

    const response = await request(testApp)
      .delete(`/api/products/${product.id}/reviews/${created.body.data.id}`)
      .set("Authorization", authHeaderFor(stranger.id));

    expect(response.status).toBe(403);
  });

  it("lets an admin delete any review", async () => {
    const { product, size } = await createProduct("Admin Moderated Jacket");
    const buyer = await createUser("Moderated Reviewer", "moderated-reviewer");
    await createDeliveredOrderItem(buyer.id, product.id, size.id);
    const { authHeader: adminAuthHeader } = await createAdminSession();

    const created = await request(testApp)
      .post(`/api/products/${product.id}/reviews`)
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ rating: 1, body: "Reported for abusive language, needs moderation." });

    const response = await request(testApp)
      .delete(`/api/products/${product.id}/reviews/${created.body.data.id}`)
      .set("Authorization", adminAuthHeader);

    expect(response.status).toBe(200);
  });
});
