export const outfitQueryKey = (outfitId: string) => ["outfit", outfitId] as const;

export const replacementsQueryKey = (outfitId: string, slotKey: string, position: number) =>
  ["outfit", outfitId, "replacements", slotKey, position] as const;

export const myBuildLookQueryKey = (outfitId: string) => ["outfit", outfitId, "my-look"] as const;

export const MY_BUILDS_QUERY_KEY = ["outfits", "mine"] as const;

export const SHARED_BUILDS_QUERY_KEY = ["outfits", "shared-with-me"] as const;
