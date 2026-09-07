import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { getCategoriesServer } from "@/features/categories";
import { CategoryResults, TasteCategories } from "@/features/landing";
import { CategorySelectionProvider } from "@/features/landing/lib/CategorySelectionContext";
import { getProductsFirstPageServer, getProductTypesServer } from "@/features/products";
import { ALL_TYPE_ID } from "@/shared/components/CategoryTypeFilters";
import { getQueryClient } from "@/shared/lib/getQueryClient";

interface TasteResultsSlotProps {
  categorySlug?: string;
  typeId?: string;
}

export const TasteResultsSlot = async ({ categorySlug, typeId }: TasteResultsSlotProps) => {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({ queryKey: ["categories"], queryFn: getCategoriesServer });
  const categories = await getCategoriesServer();
  const activeCategorySlug = categorySlug ?? categories[0]?.slug;
  const activeType = typeId && typeId !== ALL_TYPE_ID ? typeId : undefined;

  await Promise.all([
    queryClient.prefetchQuery({ queryKey: ["product-types"], queryFn: getProductTypesServer }),
    activeCategorySlug
      ? queryClient.prefetchInfiniteQuery({
          queryKey: [
            "products",
            activeCategorySlug,
            activeType,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          ],
          queryFn: async () => {
            const firstPage = await getProductsFirstPageServer({
              category: activeCategorySlug,
              type: activeType,
            });
            if (!firstPage) throw new Error("Products first page unavailable during prefetch");
            return firstPage;
          },
          initialPageParam: undefined,
        })
      : Promise.resolve(),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CategorySelectionProvider>
        <TasteCategories />
        <CategoryResults />
      </CategorySelectionProvider>
    </HydrationBoundary>
  );
};
