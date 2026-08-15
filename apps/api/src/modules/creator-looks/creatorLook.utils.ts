import type { CreatorLookSummary } from "./creatorLook.types.js";

export const toSummary = ({
  id,
  creatorId,
  imageUrl,
  caption,
  createdAt,
  taggedProducts,
}: {
  id: string;
  creatorId: string;
  imageUrl: string;
  caption: string | null;
  createdAt: Date;
} & {
  taggedProducts: { product: { id: string; name: string; imageUrl: string | null } }[];
}): CreatorLookSummary => ({
  id,
  creatorId,
  imageUrl,
  caption,
  createdAt,
  taggedProducts: taggedProducts.map((tagged) => tagged.product),
});

export type SimpleCursor = { c: string; i: string };
export type TrendingSnapshotCursor = { sessionId: string; offset: number };

export const encodeCursor = <T>(cursorPayload: T): string =>
  Buffer.from(JSON.stringify(cursorPayload)).toString("base64url");

export const decodeCursor = <T>(cursor?: string): T | undefined => {
  if (!cursor) return undefined;
  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as T;
  } catch {
    return undefined;
  }
};
