import { Readable } from "node:stream";

import { describe, expect, it } from "vitest";

import type { StorageAdapter } from "./storage-adapter.types.js";
import { StorageKeyNotFoundError } from "./storage-adapter.types.js";

export const runStorageAdapterContractTests = (
  adapterName: string,
  createAdapter: () => StorageAdapter | Promise<StorageAdapter>,
) => {
  describe(`StorageAdapter contract: ${adapterName}`, () => {
    it("round-trips a buffer through put/get", async () => {
      const adapter = await createAdapter();
      const key = `contract/${adapterName}/buffer-round-trip.bin`;
      const sourceBytes = Buffer.from("hello storage adapter");

      await adapter.put(key, sourceBytes);

      await expect(adapter.get(key)).resolves.toEqual(sourceBytes);
    });

    it("round-trips a stream through put/get", async () => {
      const adapter = await createAdapter();
      const key = `contract/${adapterName}/stream-round-trip.bin`;
      const sourceBytes = Buffer.from("streamed payload");

      await adapter.put(key, Readable.from(sourceBytes));

      await expect(adapter.get(key)).resolves.toEqual(sourceBytes);
    });

    it("reports exists() as true only after a successful put", async () => {
      const adapter = await createAdapter();
      const key = `contract/${adapterName}/exists-flag.bin`;

      await expect(adapter.exists(key)).resolves.toBe(false);
      await adapter.put(key, Buffer.from("present"));
      await expect(adapter.exists(key)).resolves.toBe(true);
    });

    it("removes the object on delete, and delete is idempotent", async () => {
      const adapter = await createAdapter();
      const key = `contract/${adapterName}/delete-me.bin`;
      await adapter.put(key, Buffer.from("temporary"));

      await adapter.delete(key);
      await expect(adapter.exists(key)).resolves.toBe(false);

      await expect(adapter.delete(key)).resolves.not.toThrow();
    });

    it("rejects get() on a missing key with StorageKeyNotFoundError", async () => {
      const adapter = await createAdapter();
      await expect(adapter.get(`contract/${adapterName}/never-put.bin`)).rejects.toBeInstanceOf(
        StorageKeyNotFoundError,
      );
    });

    it("rejects getSignedUrl() on a missing key with StorageKeyNotFoundError", async () => {
      const adapter = await createAdapter();
      await expect(
        adapter.getSignedUrl(`contract/${adapterName}/never-put-signed.bin`),
      ).rejects.toBeInstanceOf(StorageKeyNotFoundError);
    });

    it("returns a resolvable signed URL for an object that exists", async () => {
      const adapter = await createAdapter();
      const key = `contract/${adapterName}/signed-url.bin`;
      await adapter.put(key, Buffer.from("signed"));

      const signedUrl = await adapter.getSignedUrl(key);
      expect(typeof signedUrl).toBe("string");
      expect(signedUrl.length).toBeGreaterThan(0);
    });

    it("overwrites an existing key on a second put", async () => {
      const adapter = await createAdapter();
      const key = `contract/${adapterName}/overwrite.bin`;

      await adapter.put(key, Buffer.from("first"));
      await adapter.put(key, Buffer.from("second"));

      await expect(adapter.get(key)).resolves.toEqual(Buffer.from("second"));
    });
  });
};
