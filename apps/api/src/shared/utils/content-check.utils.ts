import {
  ALLOWED_LINK_HOSTS,
  BLOCKED_TERMS,
  CONTENT_REFUSAL,
  CONTENT_REFUSAL_MESSAGES,
  type ContentRefusal,
  LOOKALIKE_CHARACTERS,
  MAX_REPEATED_CHARACTER_RUN,
} from "#constants/content-check.constants.js";
import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

const PLURAL_SUFFIXES = ["es", "s"];
const COMBINING_MARKS = /[̀-ͯ]/g;
const WORD_SEPARATORS = /[^\p{L}\p{M}\p{N}@$!]+/u;
const LINK_PATTERN =
  /\b(?:https?:\/\/|www\.)([^\s/?#]+)|\b([a-z0-9-]+\.(?:com|net|org|np|io|me|ly|co|shop|store))\b/gi;
const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_PATTERN = /(?:\+?977[\s-]?)?\b9[78]\d(?:[\s-]?\d){7}\b/;
const REPEATED_CHARACTER_PATTERN = new RegExp(`(.)\\1{${MAX_REPEATED_CHARACTER_RUN},}`, "u");

const blockedTermSet = new Set(BLOCKED_TERMS);

const undoLookalikes = (word: string): string =>
  [...word].map((character) => LOOKALIKE_CHARACTERS[character] ?? character).join("");

const toComparableWords = (text: string): string[] =>
  text
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .split(WORD_SEPARATORS)
    .filter(Boolean)
    .map(undoLookalikes);

const isBlockedWord = (word: string): boolean =>
  blockedTermSet.has(word) ||
  PLURAL_SUFFIXES.some(
    (suffix) => word.endsWith(suffix) && blockedTermSet.has(word.slice(0, -suffix.length)),
  );

const hasExternalLink = (text: string): boolean =>
  [...text.matchAll(LINK_PATTERN)].some((match) => {
    const host = (match[1] ?? match[2] ?? "").toLowerCase();
    return !ALLOWED_LINK_HOSTS.includes(host);
  });

export const findContentRefusal = (text: string): ContentRefusal | null => {
  if (toComparableWords(text).some(isBlockedWord)) return CONTENT_REFUSAL.BLOCKED_TERM;
  if (EMAIL_PATTERN.test(text) || PHONE_PATTERN.test(text)) return CONTENT_REFUSAL.CONTACT_DETAILS;
  if (hasExternalLink(text)) return CONTENT_REFUSAL.EXTERNAL_LINK;
  if (REPEATED_CHARACTER_PATTERN.test(text)) return CONTENT_REFUSAL.REPEATED_CHARACTERS;
  return null;
};

export const assertContentAllowed = (text: string | null | undefined): void => {
  if (!text) return;
  const refusal = findContentRefusal(text);
  if (refusal) {
    throw new AppError(
      "CONTENT_NOT_ALLOWED",
      CONTENT_REFUSAL_MESSAGES[refusal],
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      {
        reason: refusal,
      },
    );
  }
};
