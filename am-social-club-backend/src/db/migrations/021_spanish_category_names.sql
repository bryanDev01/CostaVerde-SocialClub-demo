-- ============================================================================
-- Migration 021: Spanish category names matching the activity names
-- Context: the category filter on the activities screen and the activity
--          selector showed English names (Pool, Tennis, Restaurant...) while
--          every activity is in Spanish. Categories are shown to members, so
--          they must read like the rest of the catalogue.
-- Idempotent: safe to run multiple times.
-- ============================================================================

DO $$
DECLARE
  pair TEXT[];
BEGIN
  FOREACH pair SLICE 1 IN ARRAY ARRAY[
    ['Pool', 'Piscina'],
    ['Tennis', 'Tenis'],
    ['Billiards', 'Billar'],
    ['Basketball', 'Baloncesto'],
    ['Restaurant', 'Restaurante']
  ] LOOP
    IF EXISTS (SELECT 1 FROM activity_categories WHERE name = pair[1])
       AND NOT EXISTS (SELECT 1 FROM activity_categories WHERE name = pair[2]) THEN
      UPDATE activity_categories SET name = pair[2] WHERE name = pair[1];
    END IF;
  END LOOP;
END $$;
