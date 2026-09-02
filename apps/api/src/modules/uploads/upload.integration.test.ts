import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const createUser = async () =>
  prisma.user.create({
    data: {
      email: `upload-tester-${randomUUID()}@outfiqe.test`,
      name: "Upload Tester",
      handle: `upload-tester-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: UserRole.CUSTOMER,
    },
  });

const authHeaderFor = (userId: string) => {
  const { accessToken } = generateTokenpair({ sub: userId, role: UserRole.CUSTOMER });
  return `Bearer ${accessToken}`;
};

describe("POST /api/uploads", () => {
  it("rejects an unauthenticated upload", async () => {
    const response = await request(testApp)
      .post("/api/uploads")
      .attach("files", Buffer.from(TINY_PNG_BASE64, "base64"), {
        filename: "photo.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(401);
  });

  it("rejects an image over the size limit with a message that states the limit", async () => {
    const user = await createUser();
    const oversized = Buffer.alloc(5 * 1024 * 1024 + 1, 1);

    const response = await request(testApp)
      .post("/api/uploads")
      .set("Authorization", authHeaderFor(user.id))
      .attach("files", oversized, { filename: "big.png", contentType: "image/png" });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe("INVALID_FILE");
    expect(response.body.message).toBe("Each image must be 5 MB or smaller.");
  });

  it("rejects a disallowed file type with a clear message", async () => {
    const user = await createUser();

    const response = await request(testApp)
      .post("/api/uploads")
      .set("Authorization", authHeaderFor(user.id))
      .attach("files", Buffer.from("%PDF-1.4"), {
        filename: "doc.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(422);
    expect(response.body.message).toBe("Only JPEG, PNG or WebP images are allowed.");
  });
});
