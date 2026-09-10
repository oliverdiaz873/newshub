-- Enable the unaccent dictionary for accent-insensitive editorial search.
-- The API `q` filter compares unaccent(title/summary) so queries without
-- diacritics match accented content (economia -> Economía). No schema or
-- index changes; expression indexes are deferred until catalog scale
-- requires them (unaccent() is STABLE, so a future index would need an
-- IMMUTABLE wrapper function).
CREATE EXTENSION IF NOT EXISTS "unaccent";
