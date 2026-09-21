import { z } from "zod";

import { contactLifecycleStageSchema } from "./contactsSchemas";

const NAME_MAX_LENGTH = 140;
const EMAIL_MAX_LENGTH = 200;
const PHONE_MAX_LENGTH = 40;
const SHORT_TEXT_MAX_LENGTH = 140;
const SOURCE_MAX_LENGTH = 80;
const NOTES_MAX_LENGTH = 5000;
const TAG_MAX_LENGTH = 40;
const MAX_CONTACT_TAGS = 20;

const optionalText = (maxLength: number) =>
  z.string().trim().max(maxLength, `Use at most ${maxLength} characters.`);

export const parseContactTags = (raw: string): string[] =>
  raw
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

export const contactFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter the contact's name.")
    .max(NAME_MAX_LENGTH, `Use at most ${NAME_MAX_LENGTH} characters.`),
  email: z
    .string()
    .trim()
    .max(EMAIL_MAX_LENGTH, `Use at most ${EMAIL_MAX_LENGTH} characters.`)
    .refine((value) => value === "" || z.email().safeParse(value).success, {
      message: "Enter a valid email address.",
    }),
  phone: optionalText(PHONE_MAX_LENGTH),
  company: optionalText(SHORT_TEXT_MAX_LENGTH),
  jobTitle: optionalText(SHORT_TEXT_MAX_LENGTH),
  lifecycleStage: contactLifecycleStageSchema,
  source: optionalText(SOURCE_MAX_LENGTH),
  tags: z
    .string()
    .refine((raw) => parseContactTags(raw).length <= MAX_CONTACT_TAGS, {
      message: `Use at most ${MAX_CONTACT_TAGS} tags.`,
    })
    .refine((raw) => parseContactTags(raw).every((tag) => tag.length <= TAG_MAX_LENGTH), {
      message: `Keep each tag to ${TAG_MAX_LENGTH} characters or fewer.`,
    }),
  ownerMembershipId: z.string(),
  notes: optionalText(NOTES_MAX_LENGTH),
});
export type ContactFormValues = z.infer<typeof contactFormSchema>;

export const EMPTY_CONTACT_FORM: ContactFormValues = {
  name: "",
  email: "",
  phone: "",
  company: "",
  jobTitle: "",
  lifecycleStage: "LEAD",
  source: "",
  tags: "",
  ownerMembershipId: "",
  notes: "",
};
