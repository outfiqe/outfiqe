\timing on

SELECT count(*) AS total_products, count(search_vector) AS with_search_vector FROM "products";

SELECT * FROM search_products('jaket', 20, 0);

SELECT * FROM search_products('jack', 20, 0);

EXPLAIN ANALYZE SELECT * FROM search_products('jacket', 20, 0);

SET pg_trgm.word_similarity_threshold = 0.4;

EXPLAIN ANALYZE
WITH query AS (
  SELECT nullif(trim('jacket'), '') AS raw_text
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
)
SELECT p.id
FROM "products" p
CROSS JOIN prefixed
WHERE p.status = 'APPROVED'
  AND p.deleted_at IS NULL
  AND (
    p.search_vector @@ prefixed.ts_query
    OR (prefixed.prefix_query IS NOT NULL AND p.search_vector @@ prefixed.prefix_query)
    OR prefixed.raw_text <% p.name
  );

SET enable_seqscan = off;

EXPLAIN ANALYZE
SELECT p.id FROM "products" p
WHERE p.status = 'APPROVED' AND p.deleted_at IS NULL
  AND p.search_vector @@ websearch_to_tsquery('english', 'jacket');

RESET enable_seqscan;
