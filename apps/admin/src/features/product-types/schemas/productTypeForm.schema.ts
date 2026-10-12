import { z } from "zod";

const LABEL_MIN_LENGTH = 2;
const LABEL_MAX_LENGTH = 40;
const SLUG_MIN_LENGTH = 2;
const SLUG_MAX_LENGTH = 40;
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const productTypeFormSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Enter a name for the garment type.")
    .min(LABEL_MIN_LENGTH, `Use at least ${LABEL_MIN_LENGTH} characters.`)
    .max(LABEL_MAX_LENGTH, `Use at most ${LABEL_MAX_LENGTH} characters.`),
  slug: z
    .string()
    .trim()
    .min(1, "Enter a slug for the garment type.")
    .min(SLUG_MIN_LENGTH, `Use at least ${SLUG_MIN_LENGTH} characters.`)
    .max(SLUG_MAX_LENGTH, `Use at most ${SLUG_MAX_LENGTH} characters.`)
    .regex(SLUG_PATTERN, "Use lowercase letters, numbers and hyphens only."),
});
export type ProductTypeFormValues = z.infer<typeof productTypeFormSchema>;

export const EMPTY_PRODUCT_TYPE_FORM: ProductTypeFormValues = { label: "", slug: "" };
