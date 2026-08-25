import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runStorageAdapterContractTests } from "../storage-adapter.contract.js";
import { LocalDiskStorageAdapter } from "./local-disk.adapter.js";

let rootDir: string;

beforeEach(async () => {
  rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "image-pipeline-local-disk-"));
});

afterEach(async () => {
  await fs.rm(rootDir, { recursive: true, force: true });
});

runStorageAdapterContractTests("local-disk", () => new LocalDiskStorageAdapter(rootDir));

describe("LocalDiskStorageAdapter", () => {
  it("creates nested directories for a key with slashes", async () => {
    const adapter = new LocalDiskStorageAdapter(rootDir);
    await adapter.put("2026/08/25/example.jpg", Buffer.from("nested"));

    const written = await fs.readFile(path.join(rootDir, "2026", "08", "25", "example.jpg"));
    expect(written.toString()).toBe("nested");
  });

  it("rejects a key that attempts to escape the storage root", async () => {
    const adapter = new LocalDiskStorageAdapter(rootDir);
    await expect(adapter.put("../../etc/passwd", Buffer.from("x"))).rejects.toThrow(
      /escapes storage root/,
    );
  });

  it("returns a publicBaseUrl-prefixed signed URL when configured", async () => {
    const adapter = new LocalDiskStorageAdapter(rootDir, "https://cdn.example.com/uploads");
    await adapter.put("photo.jpg", Buffer.from("data"));

    await expect(adapter.getSignedUrl("photo.jpg")).resolves.toBe(
      "https://cdn.example.com/uploads/photo.jpg",
    );
  });

  it("returns a file:// URL when no publicBaseUrl is configured", async () => {
    const adapter = new LocalDiskStorageAdapter(rootDir);
    await adapter.put("photo.jpg", Buffer.from("data"));

    await expect(adapter.getSignedUrl("photo.jpg")).resolves.toMatch(/^file:\/\//);
  });
});
