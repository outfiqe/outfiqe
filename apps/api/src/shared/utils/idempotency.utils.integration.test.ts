import { randomUUID } from "node:crypto";

import { subHours } from "date-fns/subHours";
import { describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { AppError } from "#middlewares/error-handler.js";

import {
  IDEMPOTENCY_KEY_RETENTION_HOURS,
  runIdempotencyKeyRetentionSweep,
  withIdempotency,
} from "./idempotency.utils.js";

const ENDPOINT = "test:idempotent-action";
const PARALLEL_REQUEST_COUNT = 5;
const SLOW_HANDLER_DELAY_MS = 100;
const HOURS_PAST_RETENTION = IDEMPOTENCY_KEY_RETENTION_HOURS + 1;

const createUser = () => {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `idem-${suffix}@outfiqe.test`,
      name: "Idempotency Tester",
      handle: `idem-${suffix}`,
      passwordHash: "not-used-in-tests",
      role: UserRole.CUSTOMER,
    },
  });
};

const settle = <T>(promise: Promise<T>) =>
  promise.then(
    (value) => ({ isFulfilled: true as const, value }),
    (reason: unknown) => ({ isFulfilled: false as const, reason }),
  );

describe("withIdempotency", () => {
  it("runs the handler once and replays the same answer for a repeated request", async () => {
    const user = await createUser();
    const key = randomUUID();
    let handlerRuns = 0;
    const handler = async () => {
      handlerRuns += 1;
      return { orderId: randomUUID() };
    };

    const first = await withIdempotency(user.id, ENDPOINT, key, handler, { qty: 1 });
    const replay = await withIdempotency(user.id, ENDPOINT, key, handler, { qty: 1 });

    expect(handlerRuns).toBe(1);
    expect(replay).toEqual(first);
  });

  it("treats the same body with its keys in a different order as the same request", async () => {
    const user = await createUser();
    const key = randomUUID();
    const handler = async () => ({ saved: true });

    await withIdempotency(user.id, ENDPOINT, key, handler, { qty: 1, sizeId: "a" });
    const replay = await withIdempotency(user.id, ENDPOINT, key, handler, { sizeId: "a", qty: 1 });

    expect(replay).toEqual({ saved: true });
  });

  it("rejects a key that is reused for a different request with 422", async () => {
    const user = await createUser();
    const key = randomUUID();
    await withIdempotency(user.id, ENDPOINT, key, async () => ({ saved: true }), { qty: 1 });

    const reuse = withIdempotency(user.id, ENDPOINT, key, async () => ({ saved: true }), {
      qty: 2,
    });

    await expect(reuse).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED", status: 422 });
  });

  it("runs the handler once for identical requests in flight; the rest get 409 or the same answer", async () => {
    const user = await createUser();
    const key = randomUUID();
    let handlerRuns = 0;
    const slowHandler = async () => {
      handlerRuns += 1;
      await new Promise((resolve) => setTimeout(resolve, SLOW_HANDLER_DELAY_MS));
      return { orderId: randomUUID() };
    };

    const outcomes = await Promise.all(
      Array.from({ length: PARALLEL_REQUEST_COUNT }, () =>
        settle(withIdempotency(user.id, ENDPOINT, key, slowHandler, { qty: 1 })),
      ),
    );

    expect(handlerRuns).toBe(1);
    const answers = outcomes.flatMap((outcome) => (outcome.isFulfilled ? [outcome.value] : []));
    expect(answers.length).toBeGreaterThanOrEqual(1);
    expect(new Set(answers.map(({ orderId }) => orderId)).size).toBe(1);
    const rejections = outcomes.flatMap((outcome) => (outcome.isFulfilled ? [] : [outcome.reason]));
    for (const rejection of rejections) {
      expect(rejection).toMatchObject({ code: "DUPLICATE_REQUEST", status: HTTP_STATUS.CONFLICT });
    }
  });

  it("frees the key after a business error so the user can try again", async () => {
    const user = await createUser();
    const key = randomUUID();
    const failing = withIdempotency(user.id, ENDPOINT, key, async () => {
      throw new AppError(
        "ITEMS_UNAVAILABLE",
        "Some items sold out just now.",
        HTTP_STATUS.CONFLICT,
      );
    });
    await expect(failing).rejects.toMatchObject({ code: "ITEMS_UNAVAILABLE" });

    const retry = await withIdempotency(user.id, ENDPOINT, key, async () => ({ saved: true }));

    expect(retry).toEqual({ saved: true });
  });

  it("keeps the key claimed after an unexpected error, so a retry can't repeat half-done work", async () => {
    const user = await createUser();
    const key = randomUUID();
    const crashing = withIdempotency(user.id, ENDPOINT, key, async () => {
      throw new Error("connection reset");
    });
    await expect(crashing).rejects.toThrow("connection reset");

    const retry = withIdempotency(user.id, ENDPOINT, key, async () => ({ saved: true }));

    await expect(retry).rejects.toMatchObject({ code: "DUPLICATE_REQUEST", status: 409 });
  });

  it("runs the handler directly when no key is sent", async () => {
    const user = await createUser();

    const result = await withIdempotency(user.id, ENDPOINT, undefined, async () => ({ ok: 1 }));

    expect(result).toEqual({ ok: 1 });
    expect(await prisma.requestIdempotency.count({ where: { userId: user.id } })).toBe(0);
  });
});

describe("runIdempotencyKeyRetentionSweep", () => {
  it("deletes keys older than the retention window and keeps recent ones", async () => {
    const user = await createUser();
    const expiredKey = randomUUID();
    const recentKey = randomUUID();
    await withIdempotency(user.id, ENDPOINT, expiredKey, async () => ({ saved: true }));
    await withIdempotency(user.id, ENDPOINT, recentKey, async () => ({ saved: true }));
    await prisma.requestIdempotency.update({
      where: { userId_endpoint_key: { userId: user.id, endpoint: ENDPOINT, key: expiredKey } },
      data: { createdAt: subHours(new Date(), HOURS_PAST_RETENTION) },
    });

    const { deleted } = await runIdempotencyKeyRetentionSweep();

    expect(deleted).toBe(1);
    const remainingKeys = await prisma.requestIdempotency.findMany({
      where: { userId: user.id },
      select: { key: true },
    });
    expect(remainingKeys).toEqual([{ key: recentKey }]);
  });
});
