import { describe, expect, it } from "vitest";

import { runStorageAdapterContractTests } from "../storage-adapter.contract.js";
import { InMemoryStorageAdapter } from "./in-memory.adapter.js";

runStorageAdapterContractTests("in-memory", () => new InMemoryStorageAdapter());

describe("InMemoryStorageAdapter", () => {
  it("clear() empties all stored objects", async () => {
    const adapter = new InMemoryStorageAdapter();
    await adapter.put("some/key.bin", Buffer.from("data"));

    adapter.clear();

    await expect(adapter.exists("some/key.bin")).resolves.toBe(false);
  });

  it("does not let a caller mutate its internal buffer through the returned reference", async () => {
    const adapter = new InMemoryStorageAdapter();
    const original = Buffer.from("immutable");
    await adapter.put("mutation/key.bin", original);

    const firstRead = await adapter.get("mutation/key.bin");
    firstRead.write("tampered");

    const secondRead = await adapter.get("mutation/key.bin");
    expect(secondRead.toString()).toBe("immutable");
  });
});
