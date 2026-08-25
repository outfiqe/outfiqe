import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import type {
  PutOptions,
  SignedUrlOptions,
  StorageAdapter,
  StorageKey,
} from "../storage-adapter.types.js";
import { StorageKeyNotFoundError } from "../storage-adapter.types.js";

const isEnoent = (error: unknown): boolean =>
  error instanceof Error && "code" in error && error.code === "ENOENT";

export class LocalDiskStorageAdapter implements StorageAdapter {
  constructor(
    private readonly rootDir: string,
    private readonly publicBaseUrl?: string,
  ) {}

  private resolveAbsolutePath(key: StorageKey): string {
    const absolutePath = path.resolve(this.rootDir, key);
    const relativeToRoot = path.relative(this.rootDir, absolutePath);
    if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
      throw new Error(`Storage key escapes storage root: ${key}`);
    }
    return absolutePath;
  }

  async put(key: StorageKey, input: Buffer | Readable, _options?: PutOptions): Promise<void> {
    const absolutePath = this.resolveAbsolutePath(key);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    if (Buffer.isBuffer(input)) {
      await fs.writeFile(absolutePath, input);
      return;
    }
    await pipeline(input, createWriteStream(absolutePath));
  }

  async get(key: StorageKey): Promise<Buffer> {
    try {
      return await fs.readFile(this.resolveAbsolutePath(key));
    } catch (error) {
      if (isEnoent(error)) {
        throw new StorageKeyNotFoundError(key);
      }
      throw error;
    }
  }

  async delete(key: StorageKey): Promise<void> {
    try {
      await fs.unlink(this.resolveAbsolutePath(key));
    } catch (error) {
      if (!isEnoent(error)) {
        throw error;
      }
    }
  }

  async exists(key: StorageKey): Promise<boolean> {
    try {
      await fs.access(this.resolveAbsolutePath(key));
      return true;
    } catch {
      return false;
    }
  }

  async getSignedUrl(key: StorageKey, _options?: SignedUrlOptions): Promise<string> {
    if (!(await this.exists(key))) {
      throw new StorageKeyNotFoundError(key);
    }
    if (this.publicBaseUrl) {
      return new URL(key, `${this.publicBaseUrl.replace(/\/$/, "")}/`).toString();
    }
    return new URL(`file://${this.resolveAbsolutePath(key).replace(/\\/g, "/")}`).toString();
  }
}
