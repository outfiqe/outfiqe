import { createHash, timingSafeEqual } from "node:crypto";

import { isWebRevalidateTag } from "@outfiqe/utils";
import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";

const BEARER_PREFIX = "Bearer ";

const EXPIRE_IMMEDIATELY = { expire: 0 } as const;

const digest = (value: string) => createHash("sha256").update(value).digest();

const matchesSecret = (provided: string, expected: string) =>
  timingSafeEqual(digest(provided), digest(expected));

const readBearerToken = (request: Request) => {
  const header = request.headers.get("authorization");
  if (!header?.startsWith(BEARER_PREFIX)) return null;
  return header.slice(BEARER_PREFIX.length);
};

export const POST = async (request: Request) => {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return Response.json({ error: "Revalidation is not configured." }, { status: 503 });
  }

  const providedToken = readBearerToken(request);
  if (!providedToken || !matchesSecret(providedToken, secret)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const requestedTags =
    body && typeof body === "object" && "tags" in body ? (body as { tags: unknown }).tags : null;

  if (!Array.isArray(requestedTags) || requestedTags.length === 0) {
    return Response.json({ error: "Expected a non-empty 'tags' array." }, { status: 400 });
  }

  const invalidTag = requestedTags.find((tag) => !isWebRevalidateTag(tag));
  if (invalidTag !== undefined) {
    return Response.json({ error: `Unknown tag: ${String(invalidTag)}` }, { status: 400 });
  }

  for (const tag of requestedTags) {
    revalidateTag(tag, EXPIRE_IMMEDIATELY);
  }

  return Response.json({ revalidated: true, tags: requestedTags });
};
