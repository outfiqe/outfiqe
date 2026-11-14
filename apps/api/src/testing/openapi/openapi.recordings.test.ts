import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { listOperationKeys, readRecordedExchanges } from "./openapi.recordings.js";
import type { RecordedExchange } from "./openapi.types.js";

const SHARD_FOLDER = "shard-2";

const recordedExchange = (overrides: Partial<RecordedExchange>): RecordedExchange => ({
  method: "GET",
  path: "/api/orders/mine",
  status: 200,
  query: {},
  requestBody: null,
  responseBody: { success: true, message: "Orders.", data: [] },
  ...overrides,
});

const toJsonLines = (exchanges: RecordedExchange[]): string =>
  exchanges.map((exchange) => `${JSON.stringify(exchange)}\n`).join("");

let workingDir = "";

beforeEach(() => {
  workingDir = mkdtempSync(path.join(tmpdir(), "openapi-recordings-"));
});

afterEach(() => {
  rmSync(workingDir, { recursive: true, force: true });
});

describe("readRecordedExchanges", () => {
  it("returns nothing when no recordings were made", () => {
    expect(readRecordedExchanges(path.join(workingDir, "missing"))).toEqual([]);
  });

  it("reads every recording, including ones each CI job saved in its own folder", () => {
    const firstExchange = recordedExchange({ path: "/api/orders/mine" });
    const secondExchange = recordedExchange({ method: "POST", path: "/api/cart", status: 201 });
    writeFileSync(path.join(workingDir, "worker-1.jsonl"), toJsonLines([firstExchange]));
    mkdirSync(path.join(workingDir, SHARD_FOLDER));
    writeFileSync(
      path.join(workingDir, SHARD_FOLDER, "worker-1.jsonl"),
      toJsonLines([secondExchange]),
    );

    expect(readRecordedExchanges(workingDir)).toEqual(
      expect.arrayContaining([firstExchange, secondExchange]),
    );
    expect(readRecordedExchanges(workingDir)).toHaveLength(2);
  });

  it("ignores files that are not recordings", () => {
    writeFileSync(path.join(workingDir, "notes.txt"), "not a recording");

    expect(readRecordedExchanges(workingDir)).toEqual([]);
  });

  it("rejects a recording line with the wrong shape instead of writing a broken example", () => {
    writeFileSync(path.join(workingDir, "worker-1.jsonl"), '{"method":"GET"}\n');

    expect(() => readRecordedExchanges(workingDir)).toThrow();
  });
});

describe("listOperationKeys", () => {
  it("lists every documented operation as METHOD path", () => {
    const specFilePath = path.join(workingDir, "openapi.json");
    writeFileSync(
      specFilePath,
      JSON.stringify({
        paths: {
          "/api/orders/mine": { get: {} },
          "/api/cart": { post: {}, delete: {} },
        },
      }),
    );

    expect(listOperationKeys(specFilePath)).toEqual([
      "GET /api/orders/mine",
      "POST /api/cart",
      "DELETE /api/cart",
    ]);
  });
});
