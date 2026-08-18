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
