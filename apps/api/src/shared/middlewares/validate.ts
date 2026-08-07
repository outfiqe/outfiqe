import type { NextFunction, Request, Response } from "express";
import type { z, ZodType } from "zod";
import { AppError } from "./error-handler.js";

type Schemas = {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
};

type Infer<S extends Schemas> = {
  [K in keyof S]: S[K] extends ZodType ? z.infer<S[K]> : never;
};

export const validate = <S extends Schemas>(schemas: S) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const data: Record<string, unknown> = {};
    const issues: z.core.$ZodIssue[] = [];

    for (const key of ["body", "params", "query"] as const) {
      const schema = schemas[key];
      if (!schema) continue;

      const result = schema.safeParse(req[key]);

      if (result.success) {
        data[key] = result.data;
      } else {
        issues.push(...result.error.issues);
      }
    }

    const isNotEmpty = issues.length > 0;

    if (isNotEmpty) return next(new AppError("VALIDATION_ERROR", "Invalid request", 422, issues));

    res.locals.validated = data;
    next();
  };
};

// Typed accessors for the data `validate()` stashed on res.locals — lets
// controllers pull `validated.body<T>(res)` / `validated.params<T>(res)`
// without re-parsing or casting inline.
export const validated = {
  body: <T>(res: Response): T => (res.locals.validated as Infer<Schemas>).body as T,
  params: <T>(res: Response): T => (res.locals.validated as Infer<Schemas>).params as T,
  query: <T>(res: Response): T => (res.locals.validated as Infer<Schemas>).query as T,
};
