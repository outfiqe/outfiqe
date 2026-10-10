"use client";

import { useSearchParams } from "next/navigation";
import { createContext, type ReactNode, useContext, useMemo } from "react";

import { useAuth } from "@/features/auth";
import { useTastePreferences } from "@/features/categories/hooks/useTastePreferences";
import { useIsHydrated } from "@/shared/hooks/useIsHydrated";
import { usePendingSelection } from "@/shared/hooks/usePendingSelection";

type CategorySelection = {
  readonly storedTasteSlugs: string[] | null;
  readonly isTasteCustomized: boolean;
  readonly saveTasteSlugs: (slugs: string[]) => void;
  readonly resetTasteSlugs: () => void;
  readonly pendingCategorySlug: string | null;
  readonly markCategoryPending: (slug: string) => void;
};

const noop = (): void => {};

const CategorySelectionContext = createContext<CategorySelection>({
  storedTasteSlugs: null,
  isTasteCustomized: false,
  saveTasteSlugs: noop,
  resetTasteSlugs: noop,
  pendingCategorySlug: null,
  markCategoryPending: noop,
});

type CategorySelectionProviderProps = {
  children: ReactNode;
  serverResolvedTasteSlugs?: string[] | null;
};

export const CategorySelectionProvider = ({
  children,
  serverResolvedTasteSlugs = null,
}: CategorySelectionProviderProps) => {
  const searchParamsString = useSearchParams().toString();
  const { pendingValue, markPending } = usePendingSelection<string>(searchParamsString);
  const isHydrated = useIsHydrated();
  const { isAuthResolved } = useAuth();
  const {
    storedSlugs: clientTasteSlugs,
    isCustomized: isClientTasteCustomized,
    save: saveTasteSlugs,
    reset: resetTasteSlugs,
  } = useTastePreferences();

  const clientPickIsReady = isHydrated && isAuthResolved;
  const storedTasteSlugs = clientPickIsReady ? clientTasteSlugs : serverResolvedTasteSlugs;
  const isTasteCustomized = clientPickIsReady
    ? isClientTasteCustomized
    : serverResolvedTasteSlugs !== null;

  const value = useMemo<CategorySelection>(
    () => ({
      storedTasteSlugs,
      isTasteCustomized,
      saveTasteSlugs,
      resetTasteSlugs,
      pendingCategorySlug: pendingValue,
      markCategoryPending: markPending,
    }),
    [
      storedTasteSlugs,
      isTasteCustomized,
      saveTasteSlugs,
      resetTasteSlugs,
      pendingValue,
      markPending,
    ],
  );

  return (
    <CategorySelectionContext.Provider value={value}>{children}</CategorySelectionContext.Provider>
  );
};

export const useCategorySelection = (): CategorySelection => useContext(CategorySelectionContext);
