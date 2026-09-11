import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { cookies } from "next/headers";

import { getServerAccessToken } from "@/features/auth/api/serverAuth";
import {
  getCategoriesServer,
  getTastePreferencesServer,
  parseTasteCookie,
  resolveStoredTasteSlugs,
  TASTE_CATEGORIES_COOKIE_NAME,
  TASTE_PREFERENCES_QUERY_KEY,
} from "@/features/categories";
import {
  CategoryResults,
  CategorySelectionProvider,
  resolveActiveCategorySlug,
  resolveDisplayCategories,
  TasteCategories,
} from "@/features/landing";
import { getProductsFirstPageServer, getProductTypesServer } from "@/features/products";
import { ALL_TYPE_ID } from "@/shared/components/CategoryTypeFilters";
import { getQueryClient } from "@/shared/lib/getQueryClient";

interface TasteResultsSlotProps {
  categorySlug?: string;
  typeId?: string;
}

export const TasteResultsSlot = async ({ categorySlug, typeId }: TasteResultsSlotProps) => {
  const queryClient = getQueryClient();

  const [cookieStore, accessToken] = await Promise.all([cookies(), getServerAccessToken()]);
  const cookieTasteSlugs = parseTasteCookie(cookieStore.get(TASTE_CATEGORIES_COOKIE_NAME)?.value);
  const signedInTasteSlugs = accessToken ? await getTastePreferencesServer(accessToken) : null;
  const storedTasteSlugs = resolveStoredTasteSlugs(signedInTasteSlugs, cookieTasteSlugs);

  await queryClient.prefetchQuery({ queryKey: ["categories"], queryFn: getCategoriesServer });
  const categories = await getCategoriesServer();

  const deepLinkedSlug = categorySlug ?? null;
  const displayCategories = resolveDisplayCategories(categories, storedTasteSlugs, deepLinkedSlug);
  const activeCategorySlug = resolveActiveCategorySlug(displayCategories, deepLinkedSlug);
  const activeType = typeId && typeId !== ALL_TYPE_ID ? typeId : undefined;

  if (accessToken) {
    queryClient.setQueryData(TASTE_PREFERENCES_QUERY_KEY, signedInTasteSlugs);
  }

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
      <CategorySelectionProvider serverResolvedTasteSlugs={storedTasteSlugs}>
        <TasteCategories />
        <CategoryResults />
      </CategorySelectionProvider>
    </HydrationBoundary>
  );
};
