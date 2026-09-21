import type { z } from "zod";

export type FieldErrorMap = Record<string, string>;

export const collectFieldErrors = (validationError: z.ZodError): FieldErrorMap => {
  const fieldErrors: FieldErrorMap = {};
  for (const issue of validationError.issues) {
    const fieldPath = issue.path.join(".");
    if (!(fieldPath in fieldErrors)) fieldErrors[fieldPath] = issue.message;
  }
  return fieldErrors;
};

export const validateWithSchema = <Schema extends z.ZodType>(
  schema: Schema,
  values: unknown,
): FieldErrorMap => {
  const result = schema.safeParse(values);
  return result.success ? {} : collectFieldErrors(result.error);
};
