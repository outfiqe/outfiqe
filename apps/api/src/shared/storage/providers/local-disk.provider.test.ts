import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createLocalDiskStorageProvider } from "./local-disk.provider.js";

const PUBLIC_URL = "http://api.outfiqe.test";

let uploadsDir: string;

beforeEach(async () => {
  uploadsDir = await mkdtemp(path.join(os.tmpdir(), "local-disk-provider-"));
});

afterEach(async () => {
  await rm(uploadsDir, { recursive: true, force: true });
});

describe("createLocalDiskStorageProvider", () => {
  it("reads back an uploaded file through the key taken from its public url", async () => {
    const provider = createLocalDiskStorageProvider(uploadsDir, PUBLIC_URL);
    const fileContents = Buffer.from("qr image bytes");

    const { url } = await provider.upload({
      buffer: fileContents,
      originalName: "bank-qr.PNG",
      mimeType: "image/png",
    });
    const key = provider.keyFromPublicUrl(url);

    expect(url).toMatch(/\.png$/);
    expect(key).not.toBeNull();
    expect(await provider.read(key ?? "")).toEqual(fileContents);
  });

  it.each([
    ["an outside host", "https://evil.example/uploads/abc.png"],
    ["a path outside the uploads folder", `${PUBLIC_URL}/other/abc.png`],
    ["a traversal segment", `${PUBLIC_URL}/uploads/../secrets.env`],
    ["a nested path", `${PUBLIC_URL}/uploads/nested/abc.png`],
    ["a query string", `${PUBLIC_URL}/uploads/abc.png?download=1`],
    ["an empty key", `${PUBLIC_URL}/uploads/`],
  ])("returns no key for %s", (_case, url) => {
    const provider = createLocalDiskStorageProvider(uploadsDir, PUBLIC_URL);

    expect(provider.keyFromPublicUrl(url)).toBeNull();
  });

  it("refuses to read a key that could escape the uploads folder", async () => {
    const provider = createLocalDiskStorageProvider(uploadsDir, PUBLIC_URL);

    await expect(provider.read("../secrets.env")).rejects.toThrow("unsafe storage key");
  });

  it("ignores deleting a file that does not exist", async () => {
    const provider = createLocalDiskStorageProvider(uploadsDir, PUBLIC_URL);

    await expect(provider.delete("missing.png")).resolves.toBeUndefined();
  });
});
