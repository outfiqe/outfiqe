import { z } from "zod";

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 80;
const SLUG_MIN_LENGTH = 2;
const SLUG_MAX_LENGTH = 80;
const DESCRIPTION_MAX_LENGTH = 280;
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const collectionFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a name for the collection.")
    .min(NAME_MIN_LENGTH, `Use at least ${NAME_MIN_LENGTH} characters.`)
    .max(NAME_MAX_LENGTH, `Use at most ${NAME_MAX_LENGTH} characters.`),
  slug: z
    .string()
    .trim()
    .min(1, "Enter a slug for the collection.")
    .min(SLUG_MIN_LENGTH, `Use at least ${SLUG_MIN_LENGTH} characters.`)
    .max(SLUG_MAX_LENGTH, `Use at most ${SLUG_MAX_LENGTH} characters.`)
    .regex(SLUG_PATTERN, "Use lowercase letters, numbers and hyphens only."),
  description: z
    .string()
    .trim()
    .max(DESCRIPTION_MAX_LENGTH, `Use at most ${DESCRIPTION_MAX_LENGTH} characters.`),
  imageUrl: z.string().nullable(),
  imageAssetId: z.string().nullable(),
});
export type CollectionFormValues = z.infer<typeof collectionFormSchema>;

export const EMPTY_COLLECTION_FORM: CollectionFormValues = {
  name: "",
  slug: "",
  description: "",
  imageUrl: null,
  imageAssetId: null,
};
