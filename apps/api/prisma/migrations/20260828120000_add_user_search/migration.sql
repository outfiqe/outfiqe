-- All-users name/handle typeahead for the admin surface (gamification manual
-- actions). Mirrors search_creators(), minus the is_creator/creator_status
-- filter, and reuses the existing users_name_trgm_idx / users_handle_trgm_idx
-- GIN trigram indexes.
CREATE OR REPLACE FUNCTION search_users(
  p_query text,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (id uuid, name text, handle text, avatar_url text)
LANGUAGE sql
STABLE
PARALLEL SAFE
SET pg_trgm.word_similarity_threshold = 0.4
AS $$
  WITH query AS (
    SELECT nullif(trim(p_query), '') AS raw_text
  )
  SELECT u.id, u.name, u.handle, u.avatar_url
  FROM "users" u
  CROSS JOIN query
  WHERE query.raw_text IS NOT NULL
    AND (
      u.handle ILIKE '%' || query.raw_text || '%'
      OR u.name ILIKE '%' || query.raw_text || '%'
      OR query.raw_text <% u.handle
      OR query.raw_text <% u.name
    )
  ORDER BY
    GREATEST(
      CASE WHEN u.handle ILIKE query.raw_text || '%' THEN 1.0 ELSE 0 END,
      word_similarity(query.raw_text, u.handle) * 0.9,
      word_similarity(query.raw_text, u.name) * 0.7
    ) DESC,
    u.follower_count DESC,
    u.id DESC
  LIMIT p_limit;
$$;
