-- AlterTable
ALTER TABLE "products" ADD COLUMN     "search_vector" tsvector;

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION products_compute_search_vector(
  p_product_id uuid,
  p_name text,
  p_brand_id uuid,
  p_type text
) RETURNS tsvector
LANGUAGE sql
STABLE
AS $$
  SELECT
    setweight(to_tsvector('english', coalesce(p_name, '')), 'A')
    || setweight(to_tsvector('english', coalesce(b.name, '')), 'B')
    || setweight(to_tsvector('english', coalesce(string_agg(DISTINCT c.name, ' '), '')), 'C')
    || setweight(to_tsvector('english', coalesce(replace(p_type, '_', ' '), '')), 'D')
  FROM "brands" b
  LEFT JOIN "_CategoryToProduct" pc ON pc."B" = p_product_id
  LEFT JOIN "categories" c ON c.id = pc."A"
  WHERE b.id = p_brand_id
  GROUP BY b.name;
$$;

CREATE OR REPLACE FUNCTION products_set_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."search_vector" := products_compute_search_vector(NEW."id", NEW."name", NEW."brand_id", NEW."type"::text);
  RETURN NEW;
END;
$$;

CREATE TRIGGER products_search_vector_sync
BEFORE INSERT OR UPDATE ON "products"
FOR EACH ROW
EXECUTE FUNCTION products_set_search_vector();

CREATE OR REPLACE FUNCTION products_touch_search_vector_by_brand()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE "products" SET "search_vector" = "search_vector" WHERE "brand_id" = NEW."id";
  RETURN NEW;
END;
$$;

CREATE TRIGGER brands_cascade_search_vector
AFTER UPDATE OF "name" ON "brands"
FOR EACH ROW
WHEN (OLD."name" IS DISTINCT FROM NEW."name")
EXECUTE FUNCTION products_touch_search_vector_by_brand();

CREATE OR REPLACE FUNCTION products_touch_search_vector_by_category()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE "products" p
  SET "search_vector" = "search_vector"
  WHERE p."id" IN (SELECT "B" FROM "_CategoryToProduct" WHERE "A" = NEW."id");
  RETURN NEW;
END;
$$;

CREATE TRIGGER categories_cascade_search_vector
AFTER UPDATE OF "name" ON "categories"
FOR EACH ROW
WHEN (OLD."name" IS DISTINCT FROM NEW."name")
EXECUTE FUNCTION products_touch_search_vector_by_category();

CREATE OR REPLACE FUNCTION category_links_touch_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE "products" SET "search_vector" = "search_vector" WHERE "id" = OLD."B";
    RETURN OLD;
  END IF;
  UPDATE "products" SET "search_vector" = "search_vector" WHERE "id" = NEW."B";
  RETURN NEW;
END;
$$;

CREATE TRIGGER category_links_cascade_search_vector
AFTER INSERT OR DELETE ON "_CategoryToProduct"
FOR EACH ROW
EXECUTE FUNCTION category_links_touch_search_vector();

UPDATE "products"
SET "search_vector" = products_compute_search_vector("id", "name", "brand_id", "type"::text);

-- CreateIndex
CREATE INDEX "products_search_vector_idx" ON "products" USING GIN ("search_vector");

-- CreateIndex
CREATE INDEX "products_name_trgm_idx" ON "products" USING GIN ("name" gin_trgm_ops);

CREATE OR REPLACE FUNCTION search_products(
  p_query text,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_category_id uuid DEFAULT NULL,
  p_type "ProductType" DEFAULT NULL,
  p_brand_id uuid DEFAULT NULL,
  p_min_price integer DEFAULT NULL,
  p_max_price integer DEFAULT NULL,
  p_in_stock_only boolean DEFAULT false
)
RETURNS TABLE (id uuid, rank real, total_count bigint, brand_count bigint)
LANGUAGE sql
STABLE
PARALLEL SAFE
SET pg_trgm.word_similarity_threshold = 0.3
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
        OR prefixed.raw_text <% p.name
      )
      AND (p_category_id IS NULL OR EXISTS (
        SELECT 1 FROM "_CategoryToProduct" pc WHERE pc."B" = p.id AND pc."A" = p_category_id
      ))
      AND (p_type IS NULL OR p.type = p_type)
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
