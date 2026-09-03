-- CreateTable
CREATE TABLE "product_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_types_slug_key" ON "product_types"("slug");

-- CreateIndex
CREATE INDEX "product_types_is_active_sort_order_idx" ON "product_types"("is_active", "sort_order");

-- SeedRowsFromEnum
INSERT INTO "product_types" ("slug", "label", "sort_order", "is_active") VALUES
    ('tops', 'Tops', 0, true),
    ('bottoms', 'Bottoms', 1, true),
    ('pants', 'Pants', 2, true),
    ('headwear', 'Headwear', 3, true),
    ('outerwear', 'Outerwear', 4, true),
    ('dresses', 'Dresses', 5, true);

-- AlterTable
ALTER TABLE "products" ADD COLUMN "product_type_id" UUID;

UPDATE "products" p
SET "product_type_id" = t."id"
FROM "product_types" t
WHERE lower(p."type"::text) = t."slug";

ALTER TABLE "products" ALTER COLUMN "product_type_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_product_type_id_fkey"
    FOREIGN KEY ("product_type_id") REFERENCES "product_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "products_product_type_id_idx" ON "products"("product_type_id");

-- ReplaceSearchFunctions
DROP FUNCTION IF EXISTS search_products(text, integer, integer, uuid, "ProductType", uuid, integer, integer, boolean);
DROP FUNCTION IF EXISTS products_compute_search_vector(uuid, text, uuid, text);

CREATE FUNCTION products_compute_search_vector(
  p_product_id uuid,
  p_name text,
  p_brand_id uuid,
  p_product_type_id uuid
) RETURNS tsvector
LANGUAGE sql
STABLE
AS $$
  SELECT
    setweight(to_tsvector('english', coalesce(p_name, '')), 'A')
    || setweight(to_tsvector('english', coalesce(b.name, '')), 'B')
    || setweight(to_tsvector('english', coalesce(string_agg(DISTINCT c.name, ' '), '')), 'C')
    || setweight(to_tsvector('english', coalesce(pt.label, '')), 'D')
  FROM "brands" b
  LEFT JOIN "_CategoryToProduct" pc ON pc."B" = p_product_id
  LEFT JOIN "categories" c ON c.id = pc."A"
  LEFT JOIN "product_types" pt ON pt.id = p_product_type_id
  WHERE b.id = p_brand_id
  GROUP BY b.name, pt.label;
$$;

CREATE OR REPLACE FUNCTION products_set_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."search_vector" := products_compute_search_vector(NEW."id", NEW."name", NEW."brand_id", NEW."product_type_id");
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION products_touch_search_vector_by_product_type()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE "products" SET "search_vector" = "search_vector" WHERE "product_type_id" = NEW."id";
  RETURN NEW;
END;
$$;

CREATE TRIGGER product_types_cascade_search_vector
AFTER UPDATE OF "label" ON "product_types"
FOR EACH ROW
WHEN (OLD."label" IS DISTINCT FROM NEW."label")
EXECUTE FUNCTION products_touch_search_vector_by_product_type();

CREATE FUNCTION search_products(
  p_query text,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_category_id uuid DEFAULT NULL,
  p_type uuid DEFAULT NULL,
  p_brand_id uuid DEFAULT NULL,
  p_min_price integer DEFAULT NULL,
  p_max_price integer DEFAULT NULL,
  p_in_stock_only boolean DEFAULT false
)
RETURNS TABLE (id uuid, rank real, total_count bigint, brand_count bigint)
LANGUAGE sql
STABLE
PARALLEL SAFE
SET pg_trgm.word_similarity_threshold = 0.4
AS $$
  WITH query AS (
    SELECT nullif(trim(p_query), '') AS raw_text
  ),
  parsed AS (
    SELECT
      raw_text,
      websearch_to_tsquery('english', raw_text) AS ts_query,
      nullif(trim(regexp_replace(raw_text, '[^[:alnum:]\s]', ' ', 'g')), '') AS sanitized_text
    FROM query
    WHERE raw_text IS NOT NULL
  ),
  prefixed AS (
    SELECT
      raw_text,
      ts_query,
      CASE
        WHEN sanitized_text IS NULL THEN NULL
        ELSE to_tsquery('english', regexp_replace(sanitized_text, '\s+', ':* & ', 'g') || ':*')
      END AS prefix_query
    FROM parsed
  ),
  matched AS (
    SELECT
      p.id,
      p.brand_id,
      GREATEST(
        ts_rank(p.search_vector, prefixed.ts_query),
        ts_rank(p.search_vector, prefixed.prefix_query) * 0.9,
        word_similarity(prefixed.raw_text, p.name) * 0.5
      ) AS rank
    FROM "products" p
    CROSS JOIN prefixed
    WHERE p.status = 'APPROVED'
      AND p.deleted_at IS NULL
      AND (
        p.search_vector @@ prefixed.ts_query
        OR (prefixed.prefix_query IS NOT NULL AND p.search_vector @@ prefixed.prefix_query)
        OR (
          prefixed.raw_text <% p.name
          AND EXISTS (
            SELECT 1
            FROM regexp_split_to_table(p.name, '\s+') AS name_word
            WHERE similarity(prefixed.raw_text, name_word) > 0.4
          )
        )
      )
      AND (p_category_id IS NULL OR EXISTS (
        SELECT 1 FROM "_CategoryToProduct" pc WHERE pc."B" = p.id AND pc."A" = p_category_id
      ))
      AND (p_type IS NULL OR p.product_type_id = p_type)
      AND (p_brand_id IS NULL OR p.brand_id = p_brand_id)
      AND (p_min_price IS NULL OR p.price >= p_min_price)
      AND (p_max_price IS NULL OR p.price <= p_max_price)
      AND (
        NOT p_in_stock_only
        OR EXISTS (SELECT 1 FROM "product_sizes" ps WHERE ps.product_id = p.id AND ps.stock > 0)
      )
  ),
  counted AS (
    SELECT count(*) AS total, count(DISTINCT brand_id) AS brands FROM matched
  )
  SELECT
    matched.id,
    matched.rank,
    counted.total AS total_count,
    counted.brands AS brand_count
  FROM matched
  CROSS JOIN counted
  ORDER BY matched.rank DESC, matched.id DESC
  LIMIT p_limit OFFSET p_offset;
$$;

-- DropColumn
ALTER TABLE "products" DROP COLUMN "type";

-- AlterTable
ALTER TABLE "size_options" ADD COLUMN "product_type_id" UUID;

UPDATE "size_options" s
SET "product_type_id" = t."id"
FROM "product_types" t
WHERE lower(s."type"::text) = t."slug";

ALTER TABLE "size_options" ALTER COLUMN "product_type_id" SET NOT NULL;

-- DropIndex
DROP INDEX "size_options_type_label_key";

-- AddForeignKey
ALTER TABLE "size_options" ADD CONSTRAINT "size_options_product_type_id_fkey"
    FOREIGN KEY ("product_type_id") REFERENCES "product_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "size_options_product_type_id_label_key" ON "size_options"("product_type_id", "label");

-- DropColumn
ALTER TABLE "size_options" DROP COLUMN "type";

-- DropEnum
DROP TYPE "ProductType";

-- RecomputeSearchVectors
UPDATE "products" SET "search_vector" = products_compute_search_vector("id", "name", "brand_id", "product_type_id");
