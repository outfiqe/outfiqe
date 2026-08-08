const MESSAGES: Record<string, string> = {
  RATE_LIMITED: "You've already applied a few times today. Please try again tomorrow.",
  VALIDATION_ERROR: "Please check the form for errors and try again.",
};

export const getBrandApplicationErrorMessage = (code: string | undefined): string => {
  if (!code) return "Something went wrong. Please try again.";
  return (
    MESSAGES[code] ?? "We couldn't send your application right now. Please try again in a moment."
  );
};
