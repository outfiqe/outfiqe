import type { NextFunction, Request, Response } from "express";
import type { z, ZodType } from "zod";

import { AppError } from "./error-handler.js";

type Schemas = {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
};

export const validate = <S extends Schemas>(schemas: S) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const validatedFields: Record<string, unknown> = {};
    const issues: z.core.$ZodIssue[] = [];

    for (const key of ["body", "params", "query"] as const) {
      const schema = schemas[key];
      if (!schema) continue;

      const result = schema.safeParse(req[key]);

      if (result.success) {
        validatedFields[key] = result.data;
      } else {
        issues.push(...result.error.issues);
      }
    }

    const isNotEmpty = issues.length > 0;

    if (isNotEmpty) return next(new AppError("VALIDATION_ERROR", "Invalid request", 422, issues));

    res.locals.validated = validatedFields;
    next();
  };
};

export const validated = {
  body: <T>(res: Response): T => res.locals.validated.body,
  params: <T>(res: Response): T => res.locals.validated.params,
  query: <T>(res: Response): T => res.locals.validated.query,
};
