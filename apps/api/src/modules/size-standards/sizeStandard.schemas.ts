import { z } from "zod";

const NAME_MIN_LENGTH = 1;
const NAME_MAX_LENGTH = 60;
const LABEL_MIN_LENGTH = 1;
const LABEL_MAX_LENGTH = 12;
const MIN_LABELS_PER_STANDARD = 1;
const MAX_LABELS_PER_STANDARD = 20;

const DUPLICATE_LABELS_MESSAGE = "Each size can only appear once in a size standard.";

const sizeLabelSchema = z.string().trim().min(LABEL_MIN_LENGTH).max(LABEL_MAX_LENGTH);

const hasNoDuplicateLabels = (labels: string[]): boolean =>
  new Set(labels.map((label) => label.toLocaleLowerCase())).size === labels.length;

const orderedLabelsSchema = z
  .array(sizeLabelSchema)
  .min(MIN_LABELS_PER_STANDARD, "Add at least one size")
  .max(MAX_LABELS_PER_STANDARD)
  .refine(hasNoDuplicateLabels, { message: DUPLICATE_LABELS_MESSAGE });

const standardNameSchema = z.string().trim().min(NAME_MIN_LENGTH).max(NAME_MAX_LENGTH);

export const createSizeStandardSchema = z.object({
  name: standardNameSchema,
  labels: orderedLabelsSchema,
});

export const updateSizeStandardSchema = z
  .object({
    name: standardNameSchema.optional(),
    labels: orderedLabelsSchema.optional(),
  })
  .refine((changes) => changes.name !== undefined || changes.labels !== undefined, {
    message: "Change the name or the sizes.",
  });

export const sizeStandardIdParamSchema = z.object({ id: z.uuid() });

export type CreateSizeStandardBody = z.infer<typeof createSizeStandardSchema>;
export type UpdateSizeStandardBody = z.infer<typeof updateSizeStandardSchema>;
export type SizeStandardIdParam = z.infer<typeof sizeStandardIdParamSchema>;
