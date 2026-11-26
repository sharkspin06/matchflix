-- Coarsen saved locations to the same ~1 km grid the API now applies on save
-- (see src/utils/location.util.ts), so no exact positions remain in the database.
UPDATE "profiles"
SET "latitude"  = ROUND("latitude"::numeric, 2)::double precision,
    "longitude" = ROUND("longitude"::numeric, 2)::double precision
WHERE "latitude" IS NOT NULL OR "longitude" IS NOT NULL;
