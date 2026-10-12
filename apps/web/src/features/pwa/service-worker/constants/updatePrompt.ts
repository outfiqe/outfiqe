export const UPDATE_PROMPT_SUPPRESSED_PATHS = ["/checkout", "/payments", "/cart"];

export const isUpdatePromptSuppressed = (pathname: string): boolean =>
  UPDATE_PROMPT_SUPPRESSED_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
