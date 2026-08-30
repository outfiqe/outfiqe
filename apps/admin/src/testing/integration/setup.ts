import { configure } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";

import { mswServer } from "./msw/server";

const ASYNC_UTIL_TIMEOUT_MS = 5000;
configure({ asyncUtilTimeout: ASYNC_UTIL_TIMEOUT_MS });

beforeAll(() => mswServer.listen({ onUnhandledRequest: "error" }));
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());
