-- CreateIndex
CREATE INDEX "users_handle_trgm_idx" ON "users" USING GIN ("handle" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "users_name_trgm_idx" ON "users" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "creator_looks_caption_trgm_idx" ON "creator_looks" USING GIN ("caption" gin_trgm_ops);

CREATE OR REPLACE FUNCTION search_creators(
  p_query text,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (id uuid, rank real, total_count bigint)
LANGUAGE sql
STABLE
PARALLEL SAFE
SET pg_trgm.word_similarity_threshold = 0.4
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

CREATE OR REPLACE FUNCTION search_creator_looks(
  p_query text,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (id uuid, rank real, total_count bigint)
LANGUAGE sql
STABLE
PARALLEL SAFE
SET pg_trgm.word_similarity_threshold = 0.4
AS $$
  WITH query AS (
    SELECT nullif(trim(p_query), '') AS raw_text
  ),
  normalized AS (
    SELECT raw_text, ltrim(raw_text, '#') AS hashtag_text
    FROM query
    WHERE raw_text IS NOT NULL
  ),
  matched AS (
    SELECT
      cl.id,
      GREATEST(
        CASE WHEN EXISTS (
          SELECT 1 FROM "creator_look_hashtags" h
          WHERE h.creator_look_id = cl.id AND h.tag ILIKE normalized.hashtag_text || '%'
        ) THEN 1.0 ELSE 0 END,
        coalesce(word_similarity(normalized.raw_text, cl.caption), 0) * 0.7
      ) AS rank
    FROM "creator_looks" cl
    JOIN "users" u ON u.id = cl.creator_id
    CROSS JOIN normalized
    WHERE cl.deleted_at IS NULL
      AND u.creator_status = 'APPROVED'
      AND (
        (cl.caption IS NOT NULL AND normalized.raw_text <% cl.caption)
        OR EXISTS (
          SELECT 1 FROM "creator_look_hashtags" h
          WHERE h.creator_look_id = cl.id AND h.tag ILIKE normalized.hashtag_text || '%'
        )
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
