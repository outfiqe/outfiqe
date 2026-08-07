import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { AppError } from "./errorHandler.js";

interface Schemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

// Validates incoming requests at the edge so services can trust their input.
// Parsed values are stashed on res.locals (Express 5 makes req.query a
// getter, so we don't mutate the request object).
export function validate(schemas: Schemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) res.locals.body = schemas.body.parse(req.body);
      if (schemas.params) res.locals.params = schemas.params.parse(req.params);
      if (schemas.query) res.locals.query = schemas.query.parse(req.query);
      next();
    } catch (err) {
      next(
        new AppError(
          "VALIDATION_ERROR",
          "Invalid request",
          422,
          (err as { issues?: unknown }).issues,
        ),
      );
    }
  };
}

// Typed accessors so controllers don't sprinkle casts everywhere.
export const validated = {
  body: <T>(res: Response): T => res.locals.body as T,
  params: <T>(res: Response): T => res.locals.params as T,
  query: <T>(res: Response): T => res.locals.query as T,
};
