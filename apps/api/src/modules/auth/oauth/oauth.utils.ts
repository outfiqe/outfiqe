const SAFE_REDIRECT_FALLBACK = "/";

export const sanitizeOAuthRedirectPath = (candidate: string | undefined): string => {
  if (!candidate) return SAFE_REDIRECT_FALLBACK;

  const isSameOriginRelativePath =
    candidate.startsWith("/") && !candidate.startsWith("//") && !candidate.startsWith("/\\");

  return isSameOriginRelativePath ? candidate : SAFE_REDIRECT_FALLBACK;
};
