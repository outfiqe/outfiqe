export const CONTENT_REFUSAL = {
  BLOCKED_TERM: "BLOCKED_TERM",
  EXTERNAL_LINK: "EXTERNAL_LINK",
  CONTACT_DETAILS: "CONTACT_DETAILS",
  REPEATED_CHARACTERS: "REPEATED_CHARACTERS",
} as const;

export type ContentRefusal = (typeof CONTENT_REFUSAL)[keyof typeof CONTENT_REFUSAL];

export const CONTENT_REFUSAL_MESSAGES: Record<ContentRefusal, string> = {
  BLOCKED_TERM: "This includes words that aren't allowed on Outfiqe.",
  EXTERNAL_LINK: "Links to other websites aren't allowed here.",
  CONTACT_DETAILS: "Phone numbers and email addresses aren't allowed here.",
  REPEATED_CHARACTERS: "This looks like spam. Try writing it differently.",
};

export const BLOCKED_TERMS: readonly string[] = [
  "fuck",
  "fucker",
  "fucking",
  "motherfucker",
  "shit",
  "bitch",
  "bastard",
  "cunt",
  "slut",
  "whore",
  "nigger",
  "nigga",
  "faggot",
  "retard",
  "muji",
  "mujhi",
  "randi",
  "machikne",
  "machikney",
  "lado",
  "puti",
  "chikne",
  "मुजी",
  "रण्डी",
  "रन्डी",
  "माचिक्ने",
  "लाडो",
  "पुती",
  "चिक्ने",
];

export const LOOKALIKE_CHARACTERS: Readonly<Record<string, string>> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
  "!": "i",
};

export const ALLOWED_LINK_HOSTS: readonly string[] = ["outfiqe.com", "www.outfiqe.com"];

export const MAX_REPEATED_CHARACTER_RUN = 7;
