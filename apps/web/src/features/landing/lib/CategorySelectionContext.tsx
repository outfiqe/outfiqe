"use client";

import { useSearchParams } from "next/navigation";
import { createContext, type ReactNode, useContext, useMemo } from "react";

import { usePendingSelection } from "@/shared/hooks/usePendingSelection";

type CategorySelection = {
  readonly pendingCategorySlug: string | null;
  readonly markCategoryPending: (slug: string) => void;
};

const CategorySelectionContext = createContext<CategorySelection>({
  pendingCategorySlug: null,
  markCategoryPending: () => {},
});

export const CategorySelectionProvider = ({ children }: { children: ReactNode }) => {
  const searchParamsString = useSearchParams().toString();
  const { pendingValue, markPending } = usePendingSelection<string>(searchParamsString);

  const value = useMemo<CategorySelection>(
    () => ({ pendingCategorySlug: pendingValue, markCategoryPending: markPending }),
    [pendingValue, markPending],
  );

  return (
    <CategorySelectionContext.Provider value={value}>{children}</CategorySelectionContext.Provider>
  );
};

export const useCategorySelection = (): CategorySelection => useContext(CategorySelectionContext);
