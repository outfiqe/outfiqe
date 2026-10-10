import { z } from "zod";

const REASON_MAX_LENGTH = 300;

export const exemptionFormSchema = z
  .object({
    brandId: z.string().min(1, "Pick the brand this exemption is for."),
    startsAt: z.string().min(1, "Choose a start date."),
    endsAt: z.string().min(1, "Choose an end date."),
    reason: z
      .string()
      .trim()
      .min(1, "Explain why this brand is exempt.")
      .max(REASON_MAX_LENGTH, `Use at most ${REASON_MAX_LENGTH} characters.`),
  })
  .refine(
    (values) => values.startsAt === "" || values.endsAt === "" || values.endsAt > values.startsAt,
    {
      message: "The end date must be after the start date.",
      path: ["endsAt"],
    },
  );
export type ExemptionFormValues = z.infer<typeof exemptionFormSchema>;

export const EMPTY_EXEMPTION_FORM: ExemptionFormValues = {
  brandId: "",
  startsAt: "",
  endsAt: "",
  reason: "",
};
