import { afterAll, afterEach, beforeAll } from "vitest";

import { mswServer } from "./msw/server";

const SETTLE_CHECK_INTERVAL_MS = 50;
const MAX_SETTLE_CHECKS = 40;
const NO_CHECKS_LEFT = 0;
const NO_REQUESTS_IN_FLIGHT = 0;
const CHECK_STEP = 1;
const NEXT_MACROTASK_DELAY_MS = 0;

const requestIdsInFlight = new Set<string>();

mswServer.events.on("request:start", ({ requestId }) => {
  requestIdsInFlight.add(requestId);
});
mswServer.events.on("request:end", ({ requestId }) => {
  requestIdsInFlight.delete(requestId);
});

const pauseFor = (delayMs: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });

const waitForRequestsToSettle = async (checksLeft: number = MAX_SETTLE_CHECKS): Promise<void> => {
  const hasNothingInFlight = requestIdsInFlight.size === NO_REQUESTS_IN_FLIGHT;
  if (hasNothingInFlight || checksLeft === NO_CHECKS_LEFT) {
    await pauseFor(NEXT_MACROTASK_DELAY_MS);
    return;
  }
  await pauseFor(SETTLE_CHECK_INTERVAL_MS);
  await waitForRequestsToSettle(checksLeft - CHECK_STEP);
};

beforeAll(() => mswServer.listen({ onUnhandledRequest: "error" }));
afterEach(async () => {
  await waitForRequestsToSettle();
  mswServer.resetHandlers();
});
afterAll(async () => {
  await waitForRequestsToSettle();
  mswServer.close();
});
