import { Readable } from "node:stream";

import type {
  PutOptions,
  SignedUrlOptions,
  StorageAdapter,
  StorageKey,
} from "../storage-adapter.types.js";
import { StorageKeyNotFoundError } from "../storage-adapter.types.js";

const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

export class InMemoryStorageAdapter implements StorageAdapter {
  private readonly objects = new Map<StorageKey, Buffer>();

  async put(key: StorageKey, input: Buffer | Readable, _options?: PutOptions): Promise<void> {
    const buffer = input instanceof Readable ? await streamToBuffer(input) : input;
    this.objects.set(key, Buffer.from(buffer));
  }

  async get(key: StorageKey): Promise<Buffer> {
    const buffer = this.objects.get(key);
    if (!buffer) {
      throw new StorageKeyNotFoundError(key);
    }
    return Buffer.from(buffer);
  }

  async delete(key: StorageKey): Promise<void> {
    this.objects.delete(key);
  }

  async exists(key: StorageKey): Promise<boolean> {
    return this.objects.has(key);
  }

  async getSignedUrl(key: StorageKey, options?: SignedUrlOptions): Promise<string> {
    if (!this.objects.has(key)) {
      throw new StorageKeyNotFoundError(key);
    }
    const expiresInSeconds = options?.expiresInSeconds ?? 0;
    return `memory://${key}?expiresInSeconds=${expiresInSeconds}`;
  }

  clear(): void {
    this.objects.clear();
  }
}
