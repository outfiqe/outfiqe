const MAX_TAG_LENGTH = 30;
const MAX_TAGS_PER_CAPTION = 20;

// Supports Devanagari (ऀ-ॿ) so Nepali hashtags like #दशैंफिट extract correctly.
const HASHTAG_PATTERN = /#[\wऀ-ॿ]+/g;

export const extractHashtags = (caption: string): string[] => {
  const matches = caption.match(HASHTAG_PATTERN) ?? [];

  return [
    ...new Set(
      matches
        .map((tag) => tag.slice(1).toLowerCase())
        .filter((tag) => tag.length <= MAX_TAG_LENGTH),
    ),
  ].slice(0, MAX_TAGS_PER_CAPTION);
};
