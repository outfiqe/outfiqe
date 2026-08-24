const normalizeName = (name: string): string => name.trim().toLowerCase().replace(/\s+/g, " ");

export const isNameMismatch = (accountName: string, legalName: string): boolean =>
  normalizeName(accountName) !== normalizeName(legalName);
