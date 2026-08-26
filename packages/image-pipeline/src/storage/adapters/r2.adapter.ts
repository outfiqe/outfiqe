import type { Readable } from "node:stream";

import type {
  PutOptions,
  SignedUrlOptions,
  StorageAdapter,
  StorageKey,
} from "../storage-adapter.types.js";

export type R2StorageAdapterConfig = {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl?: string;
};

const notImplemented = (): never => {
  throw new Error(
    "R2StorageAdapter is not implemented yet. It exists only to reserve the additive seam " +
      "described in packages/image-pipeline/README.md — swapping the injected StorageAdapter " +
      "at startup is the only change needed once this adapter is built.",
  );
};

export class R2StorageAdapter implements StorageAdapter {
  constructor(private readonly config: R2StorageAdapterConfig) {
    void this.config;
  }

  async put(_key: StorageKey, _input: Buffer | Readable, _options?: PutOptions): Promise<void> {
    notImplemented();
  }

  async get(_key: StorageKey): Promise<Buffer> {
    return notImplemented();
  }

  async delete(_key: StorageKey): Promise<void> {
    notImplemented();
  }

  async exists(_key: StorageKey): Promise<boolean> {
    return notImplemented();
  }

  async getSignedUrl(_key: StorageKey, _options?: SignedUrlOptions): Promise<string> {
    return notImplemented();
  }
}
