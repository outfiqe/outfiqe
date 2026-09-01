import { createHmac, randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { env } from "#config/env.config.js";
import { prisma } from "#db/prisma.js";
import { OAuthProvider } from "#generated/prisma/enums.js";
import { hashPassword } from "#lib/password.utils.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const base64UrlEncode = (input: Buffer): string =>
  input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const buildSignedRequest = (payload: unknown): string => {
  const encodedPayload = base64UrlEncode(Buffer.from(JSON.stringify(payload)));
  const signature = createHmac("sha256", env.FACEBOOK_APP_SECRET).update(encodedPayload).digest();
  return `${base64UrlEncode(signature)}.${encodedPayload}`;
};

const buildTamperedSignedRequest = (payload: unknown): string => {
  const [, encodedPayload] = buildSignedRequest(payload).split(".");
  const bogusSignature = base64UrlEncode(Buffer.from("not-the-real-signature"));
  return `${bogusSignature}.${encodedPayload}`;
};

const uniqueEmail = () => `webhook-${randomUUID()}@outfiqe.test`;

const createUserWithFacebookIdentity = async (providerUserId: string) => {
  const user = await prisma.user.create({
    data: {
      email: uniqueEmail(),
      name: "Facebook Linked User",
      handle: `fb-linked-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: await hashPassword("correct-horse-battery"),
      emailVerified: true,
    },
  });
  await prisma.oAuthIdentity.create({
    data: {
      userId: user.id,
      provider: OAuthProvider.FACEBOOK,
      providerUserId,
      emailAtLinkTime: user.email,
    },
  });
  return user;
};

describe("POST /api/webhooks/facebook/deauthorize", () => {
  it("revokes the matching facebook identity on a valid signed request", async () => {
    const providerUserId = `fb-${randomUUID()}`;
    const user = await createUserWithFacebookIdentity(providerUserId);
    const signedRequest = buildSignedRequest({
      algorithm: "HMAC-SHA256",
      issued_at: 1700000000,
      user_id: providerUserId,
    });

    const response = await request(testApp)
      .post("/api/webhooks/facebook/deauthorize")
      .type("form")
      .send({ signed_request: signedRequest });

    expect(response.status).toBe(200);
    const identity = await prisma.oAuthIdentity.findFirstOrThrow({ where: { userId: user.id } });
    expect(identity.revokedAt).not.toBeNull();
  });

  it("rejects a tampered signed request and leaves the identity connected", async () => {
    const providerUserId = `fb-${randomUUID()}`;
    const user = await createUserWithFacebookIdentity(providerUserId);
    const signedRequest = buildTamperedSignedRequest({
      algorithm: "HMAC-SHA256",
      issued_at: 1700000000,
      user_id: providerUserId,
    });

    const response = await request(testApp)
      .post("/api/webhooks/facebook/deauthorize")
      .type("form")
      .send({ signed_request: signedRequest });

    expect(response.status).toBe(400);
    const identity = await prisma.oAuthIdentity.findFirstOrThrow({ where: { userId: user.id } });
    expect(identity.revokedAt).toBeNull();
  });

  it("no-ops safely when no matching identity exists", async () => {
    const signedRequest = buildSignedRequest({
      algorithm: "HMAC-SHA256",
      issued_at: 1700000000,
      user_id: `fb-unknown-${randomUUID()}`,
    });

    const response = await request(testApp)
      .post("/api/webhooks/facebook/deauthorize")
      .type("form")
      .send({ signed_request: signedRequest });

    expect(response.status).toBe(200);
  });
});

describe("POST /api/webhooks/facebook/data-deletion", () => {
  it("revokes the identity and returns meta's required response shape, without touching the account", async () => {
    const providerUserId = `fb-${randomUUID()}`;
    const user = await createUserWithFacebookIdentity(providerUserId);
    const signedRequest = buildSignedRequest({
      algorithm: "HMAC-SHA256",
      issued_at: 1700000000,
      user_id: providerUserId,
    });

    const response = await request(testApp)
      .post("/api/webhooks/facebook/data-deletion")
      .type("form")
      .send({ signed_request: signedRequest });

    expect(response.status).toBe(200);
    expect(typeof response.body.url).toBe("string");
    expect(typeof response.body.confirmation_code).toBe("string");

    const identity = await prisma.oAuthIdentity.findFirstOrThrow({ where: { userId: user.id } });
    expect(identity.revokedAt).not.toBeNull();

    const stillExistingUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stillExistingUser.email).toBe(user.email);
  });

  it("rejects a tampered signed request", async () => {
    const signedRequest = buildTamperedSignedRequest({
      algorithm: "HMAC-SHA256",
      issued_at: 1700000000,
      user_id: `fb-${randomUUID()}`,
    });

    const response = await request(testApp)
      .post("/api/webhooks/facebook/data-deletion")
      .type("form")
      .send({ signed_request: signedRequest });

    expect(response.status).toBe(400);
  });
});
