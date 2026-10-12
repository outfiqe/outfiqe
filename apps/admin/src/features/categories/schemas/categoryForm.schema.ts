import { z } from "zod";

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 60;
const SLUG_MIN_LENGTH = 2;
const SLUG_MAX_LENGTH = 60;
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a name for the category.")
    .min(NAME_MIN_LENGTH, `Use at least ${NAME_MIN_LENGTH} characters.`)
    .max(NAME_MAX_LENGTH, `Use at most ${NAME_MAX_LENGTH} characters.`),
  slug: z
    .string()
    .trim()
    .min(1, "Enter a slug for the category.")
    .min(SLUG_MIN_LENGTH, `Use at least ${SLUG_MIN_LENGTH} characters.`)
    .max(SLUG_MAX_LENGTH, `Use at most ${SLUG_MAX_LENGTH} characters.`)
    .regex(SLUG_PATTERN, "Use lowercase letters, numbers and hyphens only."),
  imageUrl: z.string().nullable(),
});
export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export const EMPTY_CATEGORY_FORM: CategoryFormValues = { name: "", slug: "", imageUrl: null };
