type TaggedProductArrayErrors = ({ sizeWorn?: { message?: string } } | undefined)[];

const isArrayOfFieldErrors = (value: unknown): value is TaggedProductArrayErrors =>
  Array.isArray(value);

export const SIZE_REQUIRED_SUMMARY = "Add the size you're wearing for each tagged product.";

export const collectTaggedProductSizeErrors = (
  taggedProductErrors: unknown,
  taggedProducts: { productId: string }[],
): Record<string, string> => {
  if (!isArrayOfFieldErrors(taggedProductErrors)) return {};

  const sizeErrors: Record<string, string> = {};
  taggedProductErrors.forEach((entry, index) => {
    const message = entry?.sizeWorn?.message;
    const productId = taggedProducts[index]?.productId;
    if (message && productId) sizeErrors[productId] = message;
  });
  return sizeErrors;
};

export const summarizeTaggedProductErrors = (
  taggedProductErrors: unknown,
  sizeErrors: Record<string, string>,
): string | undefined => {
  if (
    taggedProductErrors &&
    typeof taggedProductErrors === "object" &&
    !Array.isArray(taggedProductErrors) &&
    "message" in taggedProductErrors &&
    typeof taggedProductErrors.message === "string"
  ) {
    return taggedProductErrors.message;
  }
  return Object.keys(sizeErrors).length > 0 ? SIZE_REQUIRED_SUMMARY : undefined;
};
