import { z } from "zod";

const NAME_MAX_LENGTH = 60;
const LABEL_MAX_LENGTH = 12;
export const MAX_LABELS_PER_STANDARD = 20;

const hasNoDuplicateLabels = (labels: string[]): boolean =>
  new Set(labels.map((label) => label.toLocaleLowerCase())).size === labels.length;

export const sizeLabelSchema = z
  .string()
  .trim()
  .min(1, "Type a size")
  .max(LABEL_MAX_LENGTH, `Keep each size to ${LABEL_MAX_LENGTH} characters or fewer`);

export const sizeStandardFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give this size standard a name")
    .max(NAME_MAX_LENGTH, `Keep the name to ${NAME_MAX_LENGTH} characters or fewer`),
  labels: z
    .array(sizeLabelSchema)
    .min(1, "Add at least one size")
    .max(MAX_LABELS_PER_STANDARD, `A size standard can have up to ${MAX_LABELS_PER_STANDARD} sizes`)
    .refine(hasNoDuplicateLabels, "Each size can only appear once"),
});

export type SizeStandardFormValues = z.infer<typeof sizeStandardFormSchema>;

export const isDuplicateLabel = (labels: string[], candidate: string): boolean =>
  labels.some((label) => label.toLocaleLowerCase() === candidate.trim().toLocaleLowerCase());
