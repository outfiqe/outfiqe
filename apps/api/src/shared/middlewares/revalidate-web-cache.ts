import type { WebRevalidateTag } from "@outfiqe/utils";
import type { NextFunction, Request, Response } from "express";

import { revalidateWebCache } from "#lib/web-cache.utils.js";

import { isSuccessStatus } from "./cache.js";

export const revalidateWebCacheOnWrite =
  (...tags: WebRevalidateTag[]) =>
  (_req: Request, res: Response, next: NextFunction) => {
    res.on("finish", () => {
      if (isSuccessStatus(res.statusCode)) {
        void revalidateWebCache(tags);
      }
    });
    next();
  };
