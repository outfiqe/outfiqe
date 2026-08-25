import type { Readable } from "node:stream";

export type StorageKey = string;

export type PutOptions = {
  contentType?: string;
};

export type SignedUrlOptions = {
  expiresInSeconds?: number;
};

export interface StorageAdapter {
  put(key: StorageKey, input: Buffer | Readable, options?: PutOptions): Promise<void>;
  get(key: StorageKey): Promise<Buffer>;
  delete(key: StorageKey): Promise<void>;
  exists(key: StorageKey): Promise<boolean>;
  getSignedUrl(key: StorageKey, options?: SignedUrlOptions): Promise<string>;
}

export class StorageKeyNotFoundError extends Error {
  constructor(public readonly key: StorageKey) {
    super(`Storage key not found: ${key}`);
    this.name = "StorageKeyNotFoundError";
  }
}
