WITH membership_changes AS (
  SELECT e.outfit_id, e.version, e.type::text AS change, (e.payload ->> 'userId')::uuid AS user_id
  FROM outfit_events e
  WHERE e.type IN ('MEMBER_LEFT', 'MEMBER_REMOVED')
  UNION ALL
  SELECT e.outfit_id, e.version, e.type::text AS change, added.user_id::uuid
  FROM outfit_events e
  CROSS JOIN LATERAL jsonb_array_elements_text(e.payload -> 'userIds') AS added(user_id)
  WHERE e.type = 'MEMBER_ADDED'
),
latest_change AS (
  SELECT DISTINCT ON (outfit_id, user_id) outfit_id, user_id, change
  FROM membership_changes
  ORDER BY outfit_id, user_id, version DESC
),
people_who_left AS (
  SELECT latest.outfit_id, latest.user_id
  FROM latest_change latest
  WHERE latest.change = 'MEMBER_LEFT'
    AND NOT EXISTS (
      SELECT 1
      FROM outfit_members member
      WHERE member.outfit_id = latest.outfit_id AND member.user_id = latest.user_id
    )
)
UPDATE outfit_snapshots snapshot
SET contributor_ids = ARRAY(
  SELECT contributor.id
  FROM unnest(snapshot.contributor_ids) WITH ORDINALITY AS contributor(id, position)
  WHERE contributor.id NOT IN (
    SELECT departed.user_id FROM people_who_left departed WHERE departed.outfit_id = snapshot.outfit_id
  )
  ORDER BY contributor.position
)
WHERE EXISTS (
  SELECT 1
  FROM people_who_left departed
  WHERE departed.outfit_id = snapshot.outfit_id AND departed.user_id = ANY(snapshot.contributor_ids)
);
