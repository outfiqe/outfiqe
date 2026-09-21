import { z } from "zod";

const TAG_MAX_LENGTH = 60;
const TITLE_MAX_LENGTH = 120;
const DESCRIPTION_MAX_LENGTH = 280;
const CTA_LABEL_MAX_LENGTH = 40;

const requiredText = (fieldName: string, maxLength: number) =>
  z
    .string()
    .trim()
    .min(1, `Enter ${fieldName}.`)
    .max(maxLength, `Use at most ${maxLength} characters.`);

export const heroSlideFormSchema = z.object({
  tag: requiredText("a tag", TAG_MAX_LENGTH),
  title: requiredText("a title", TITLE_MAX_LENGTH),
  description: requiredText("a description", DESCRIPTION_MAX_LENGTH),
  ctaLabel: requiredText("a button label", CTA_LABEL_MAX_LENGTH),
  ctaHref: z.string().trim().min(1, "Enter where the button should link to."),
  imageUrl: z.string().nullable(),
  imageAssetId: z.string().nullable(),
});
export type HeroSlideFormValues = z.infer<typeof heroSlideFormSchema>;

export const EMPTY_HERO_SLIDE_FORM: HeroSlideFormValues = {
  tag: "",
  title: "",
  description: "",
  ctaLabel: "",
  ctaHref: "",
  imageUrl: null,
  imageAssetId: null,
};
