export const resolveStoredTasteSlugs = (
  signedInServerRecord: string[] | null,
  cookieSlugs: string[] | null,
): string[] | null => signedInServerRecord ?? cookieSlugs;
