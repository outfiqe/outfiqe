import { z } from "zod";

const TITLE_MAX_LENGTH = 140;
const MAX_DEAL_VALUE = 1_000_000_000;

export type DealFormValues = {
  title: string;
  stageId: string;
  value: string;
  partnerCreatorId: string;
};

export const buildDealFormSchema = (isEditing: boolean) =>
  z.object({
    title: z
      .string()
      .trim()
      .min(1, "Enter a title for the deal.")
      .max(TITLE_MAX_LENGTH, `Use at most ${TITLE_MAX_LENGTH} characters.`),
    stageId: z.string().min(1, "Choose a stage."),
    value: z
      .string()
      .trim()
      .refine((raw) => raw === "" || /^\d+$/.test(raw), {
        message: "Enter a whole number of rupees, with no decimals or minus sign.",
      })
      .refine((raw) => raw === "" || Number(raw) <= MAX_DEAL_VALUE, {
        message: "That value is too large.",
      }),
    partnerCreatorId: isEditing
      ? z.string()
      : z.string().min(1, "Choose the partner for this deal."),
  });

export const dealValueFrom = (raw: string): number => (raw.trim() === "" ? 0 : Number(raw));
