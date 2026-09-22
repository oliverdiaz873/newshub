-- M-06 (data-model-physical-plan, D6): media orphan observability.
-- Read-only view. No deletes, no CASCADE, no automated purge.
-- Purge stays manual + audited (audit_events action='media.purge').

CREATE VIEW "media_orphans" AS
SELECT m.*
FROM "media_assets" m
WHERE NOT EXISTS (SELECT 1 FROM "articles" a WHERE a."cover_media_id" = m."id")
  AND NOT EXISTS (SELECT 1 FROM "opinions" o WHERE o."cover_media_id" = m."id");
