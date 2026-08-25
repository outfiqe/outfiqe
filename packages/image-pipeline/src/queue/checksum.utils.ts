import { createHash } from "node:crypto";

export const computeChecksum = (buffer: Buffer): string =>
  createHash("sha256").update(buffer).digest("hex");
