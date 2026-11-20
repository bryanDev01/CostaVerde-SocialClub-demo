-- ============================================================================
-- Migration 027: activity photos point to the new image folders
-- Context: the public/images tree was reorganized and several old folders were
--          removed, leaving activity image_url values pointing to missing files.
--          This updates the places whose new folder matches unambiguously.
-- Idempotent: safe to run multiple times.
-- ============================================================================

UPDATE activities SET image_url = '/images/Sala de Juegos/Sala-de-juegos.jpg'
  WHERE name = 'Sala de Juegos';

UPDATE activities SET image_url = '/images/Belleza/Salon-de-belleza.jpeg'
  WHERE name = 'Salón de Belleza';

UPDATE activities SET image_url = '/images/Piscina Artificial/piscina.jpg'
  WHERE name = 'Piscina Principal';

UPDATE activities SET image_url = '/images/Piscina Natural/playa.jpg'
  WHERE name = 'Excursión a la Playa';
