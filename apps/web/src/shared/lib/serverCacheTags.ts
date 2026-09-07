import { WEB_REVALIDATE_TAGS, type WebRevalidateTag } from "@outfiqe/utils";

export const SHARED_CONTENT_REVALIDATE_SECONDS = 120;

export const SERVER_CACHE_TAGS = WEB_REVALIDATE_TAGS;

export type ServerCacheTag = WebRevalidateTag;
