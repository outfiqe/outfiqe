import "server-only";

const apiUrl = process.env.API_URL ?? "http://localhost:4000";

const SITEMAP_REVALIDATE_SECONDS = 60 * 60 * 6;
const MAX_ENTRIES_PER_TYPE = 5000;
const PAGE_SIZE = 50;
const MAX_PAGES = MAX_ENTRIES_PER_TYPE / PAGE_SIZE;

interface SitemapEntity {
  slug: string;
  updatedAt?: string;
}

const fetchJson = async <T>(path: string): Promise<T | null> => {
  try {
    const response = await fetch(`${apiUrl}/api${path}`, {
      next: { revalidate: SITEMAP_REVALIDATE_SECONDS },
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { success?: boolean; data?: T };
    if (!json.success) return null;
    return json.data ?? null;
  } catch {
    return null;
  }
};

const collectCursorPaged = async <TItem>(
  basePath: string,
  readItems: (data: unknown) => { items: TItem[]; nextCursor: string | null },
  toEntity: (item: TItem) => SitemapEntity | null,
): Promise<SitemapEntity[]> => {
  const entities: SitemapEntity[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const separator = basePath.includes("?") ? "&" : "?";
    const query = `${basePath}${separator}limit=${PAGE_SIZE}${cursor ? `&cursor=${cursor}` : ""}`;
    const data = await fetchJson<unknown>(query);
    if (!data) break;

    const { items, nextCursor } = readItems(data);
    for (const item of items) {
      const entity = toEntity(item);
      if (entity) entities.push(entity);
    }

    if (!nextCursor || items.length === 0) break;
    cursor = nextCursor;
  }

  return entities;
};

export const getSitemapProducts = () =>
  collectCursorPaged<{ id: string }>(
    "/products",
    (data) => {
      const typed = data as { products?: { id: string }[]; nextCursor?: string | null };
      return { items: typed.products ?? [], nextCursor: typed.nextCursor ?? null };
    },
    (item) => (item.id ? { slug: item.id } : null),
  );

export const getSitemapBrands = () =>
  collectCursorPaged<{ id: string }>(
    "/brands",
    (data) => {
      const typed = data as { brands?: { id: string }[]; nextCursor?: string | null };
      return { items: typed.brands ?? [], nextCursor: typed.nextCursor ?? null };
    },
    (item) => (item.id ? { slug: item.id } : null),
  );

export const getSitemapCollections = async (): Promise<SitemapEntity[]> => {
  const data = await fetchJson<{ collections?: { slug: string; updatedAt?: string }[] }>(
    "/collections",
  );
  return (data?.collections ?? [])
    .filter((collection) => Boolean(collection.slug))
    .map((collection) => ({ slug: collection.slug, updatedAt: collection.updatedAt }));
};

export const getSitemapCategories = async (): Promise<SitemapEntity[]> => {
  const data = await fetchJson<{ slug: string }[]>("/categories");
  return (data ?? [])
    .filter((category) => Boolean(category.slug))
    .map((category) => ({
      slug: category.slug,
    }));
};

export const getSitemapCreators = async (): Promise<SitemapEntity[]> => {
  const data = await fetchJson<{ entries?: { creatorHandle: string }[] }>(
    "/creator-leaderboard?category=TOP_CREATOR&limit=100",
  );
  const handles = new Set(
    (data?.entries ?? []).map((entry) => entry.creatorHandle).filter(Boolean),
  );
  return [...handles].map((handle) => ({ slug: handle }));
};
