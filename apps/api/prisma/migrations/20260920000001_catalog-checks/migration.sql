-- M-03 (data-model-physical-plan): closed catalogs (D3/D4).
-- entity_type CHECKs on polymorphic tables + mime CHECK on media_assets.
-- Pre-flight (must return 0 rows before applying):
--   revisions NOT IN ('article','opinion');
--   audit_events/notifications NOT IN ('article','opinion','category','author','media','user','planning','webhook','notification');
--   planning_items.entity_type IS NOT NULL AND NOT IN ('article','opinion');
--   media_assets.mime NOT IN ('image/jpeg','image/png','image/webp','image/avif');

ALTER TABLE "revisions" ADD CONSTRAINT "revisions_entity_type_check" CHECK ("entity_type" IN ('article', 'opinion'));
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_entity_type_check" CHECK ("entity_type" IN ('article', 'opinion', 'category', 'author', 'media', 'user', 'planning', 'webhook', 'notification'));
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_entity_type_check" CHECK ("entity_type" IN ('article', 'opinion', 'category', 'author', 'media', 'user', 'planning', 'webhook', 'notification'));
ALTER TABLE "planning_items" ADD CONSTRAINT "planning_items_entity_type_check" CHECK ("entity_type" IN ('article', 'opinion'));
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_mime_check" CHECK ("mime" IN ('image/jpeg', 'image/png', 'image/webp', 'image/avif'));
