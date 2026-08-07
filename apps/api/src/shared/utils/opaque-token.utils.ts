import { createHash, randomBytes } from "node:crypto";

const OPAQUE_TOKEN_BYTES = 64;

export const generateOpaqueToken = (): string => randomBytes(OPAQUE_TOKEN_BYTES).toString("hex");

export const hashToken = (rawToken: string): string =>
  createHash("sha256").update(rawToken).digest("hex");
