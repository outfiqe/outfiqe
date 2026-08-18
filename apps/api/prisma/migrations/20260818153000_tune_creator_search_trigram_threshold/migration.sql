CREATE OR REPLACE FUNCTION search_creators(
  p_query text,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (id uuid, rank real, total_count bigint)
LANGUAGE sql
STABLE
PARALLEL SAFE
SET pg_trgm.word_similarity_threshold = 0.5
AS $$
  WITH query AS (
    SELECT nullif(trim(p_query), '') AS raw_text
  ),
  matched AS (
    SELECT
      u.id,
      GREATEST(
        CASE WHEN u.handle ILIKE query.raw_text || '%' THEN 1.0 ELSE 0 END,
        word_similarity(query.raw_text, u.handle) * 0.9,
        word_similarity(query.raw_text, u.name) * 0.7
      ) AS rank
    FROM "users" u
    CROSS JOIN query
    WHERE query.raw_text IS NOT NULL
      AND u.is_creator = true
      AND u.creator_status = 'APPROVED'
      AND (
        u.handle ILIKE '%' || query.raw_text || '%'
        OR query.raw_text <% u.handle
        OR query.raw_text <% u.name
      )
  ),
  counted AS (
    SELECT count(*) AS total FROM matched
  )
  SELECT matched.id, matched.rank, counted.total
  FROM matched
  CROSS JOIN counted
  ORDER BY matched.rank DESC, matched.id DESC
  LIMIT p_limit OFFSET p_offset;
$$;
