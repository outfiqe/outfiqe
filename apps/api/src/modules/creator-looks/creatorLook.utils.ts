import type { CreatorLookSummary } from "./creatorLook.types.js";

export const toSummary = (
  look: {
    id: string;
    creatorId: string;
    imageUrl: string;
    caption: string | null;
    createdAt: Date;
  } & {
    taggedProducts: { product: { id: string; name: string; imageUrl: string | null } }[];
  },
): CreatorLookSummary => ({
  id: look.id,
  creatorId: look.creatorId,
  imageUrl: look.imageUrl,
  caption: look.caption,
  createdAt: look.createdAt,
  taggedProducts: look.taggedProducts.map((tagged) => tagged.product),
});

export type SimpleCursor = { c: string; i: string };
export type ScoredCursor = SimpleCursor & { s: number };

export const encodeCursor = <T extends SimpleCursor>(obj: T): string =>
  Buffer.from(JSON.stringify(obj)).toString("base64url");

export const decodeCursor = <T extends SimpleCursor>(cursor?: string): T | undefined => {
  if (!cursor) return undefined;
  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as T;
  } catch {
    return undefined;
  }
};
