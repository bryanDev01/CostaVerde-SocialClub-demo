-- ============================================================================
-- Migration 028: catalogue rebuilt from the new public/images folders
-- The folder names are the activity names. Each activity stores every photo
-- of its folder in `images` (main photo first) so the app can show a gallery.
-- Idempotent: safe to run multiple times.
-- ============================================================================

ALTER TABLE activities ADD COLUMN IF NOT EXISTS images TEXT[] NOT NULL DEFAULT '{}';

UPDATE activities SET name = 'Gym' WHERE name = 'Gimnasio' AND NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Gym');
UPDATE activities SET name = 'Casa de la Pasta' WHERE name = 'Casa de la pasta' AND NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Casa de la Pasta');
UPDATE activities SET name = 'Casa del Ron' WHERE name = 'La casa del ron' AND NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Casa del Ron');
UPDATE activities SET name = 'Restaurante de Comida Criolla' WHERE name = 'Restaurante Comida Criolla' AND NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Restaurante de Comida Criolla');
UPDATE activities SET name = 'Piscina Artificial' WHERE name = 'Piscina Principal' AND NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Piscina Artificial');
UPDATE activities SET name = 'Casa del Café' WHERE name = 'Casa Cafetería' AND NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Casa del Café');
UPDATE activities SET name = 'Casa del Helado' WHERE name = 'Casa Heladería' AND NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Casa del Helado');
UPDATE activities SET name = 'Casa de la Cerveza' WHERE name = 'Parranda' AND NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Casa de la Cerveza');

INSERT INTO activities (category_id, name, description, capacity, location, image_url, images, is_active, is_reservable)
SELECT id, 'Casa del Chocolate', 'Chocolate artesanal y dulces elaborados con productos locales.', 35, 'Edificio Social', '/images/Casa del Chocolate/casa-chocolate.jpg', ARRAY['/images/Casa del Chocolate/casa-chocolate.jpg', '/images/Casa del Chocolate/casa-chocolate-0.jpg', '/images/Casa del Chocolate/casa-chocolate-1.jpg']::text[], true, false
FROM activity_categories WHERE name = 'Restaurante'
  AND NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Casa del Chocolate');

INSERT INTO activities (category_id, name, description, capacity, location, image_url, images, is_active, is_reservable)
SELECT id, 'Casa del Refresco', 'Bebidas refrescantes, aguas y jugos naturales.', 30, NULL, '/images/Casa del Refresco/casa-refresco.jpg', ARRAY['/images/Casa del Refresco/casa-refresco.jpg', '/images/Casa del Refresco/casa-refresco0.jpeg']::text[], true, false
FROM activity_categories WHERE name = 'Restaurante'
  AND NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Casa del Refresco');

INSERT INTO activities (category_id, name, description, capacity, location, image_url, images, is_active, is_reservable)
SELECT id, 'Casa la Picadera', 'Picadera cubana para compartir: frituras, embutidos y bocados tradicionales.', 40, NULL, '/images/Casa la Picadera/casa-laPicadera.jpg', ARRAY['/images/Casa la Picadera/casa-laPicadera.jpg', '/images/Casa la Picadera/casa-laPicadera0.jpg', '/images/Casa la Picadera/casa-laPicadera1.jpg', '/images/Casa la Picadera/casa-laPicadera2.jpg', '/images/Casa la Picadera/casa-laPicadera3.jpg']::text[], true, false
FROM activity_categories WHERE name = 'Restaurante'
  AND NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Casa la Picadera');

INSERT INTO activities (category_id, name, description, capacity, location, image_url, images, is_active, is_reservable)
SELECT id, 'Pan con', 'Pan con… la opción rápida del club para comer al paso.', 20, NULL, '/images/Pan con/pancon... .jpg', ARRAY['/images/Pan con/pancon... .jpg']::text[], true, false
FROM activity_categories WHERE name = 'Restaurante'
  AND NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Pan con');

INSERT INTO activities (category_id, name, description, capacity, location, image_url, images, is_active, is_reservable)
SELECT id, 'Ranchón de Comida Criolla', 'Ranchón con comida criolla cubana para grupos y familias.', 80, NULL, '/images/Ranchón de Comida Criolla/ranchón-c-criolla.jpg', ARRAY['/images/Ranchón de Comida Criolla/ranchón-c-criolla.jpg', '/images/Ranchón de Comida Criolla/ranchón-c-criolla0.jpg', '/images/Ranchón de Comida Criolla/ranchón-c-criolla1.jpg', '/images/Ranchón de Comida Criolla/ranchón-c-criolla2.jpg', '/images/Ranchón de Comida Criolla/ranchón-c-criolla3.jpg', '/images/Ranchón de Comida Criolla/ranchón-c-criolla4.jpg']::text[], true, false
FROM activity_categories WHERE name = 'Restaurante'
  AND NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Ranchón de Comida Criolla');

UPDATE activities SET image_url = '/images/Casa de la Cerveza/casa-cerveza.jpg', images = ARRAY['/images/Casa de la Cerveza/casa-cerveza.jpg', '/images/Casa de la Cerveza/casa-cerveza-0.jpg']::text[], category_id = (SELECT id FROM activity_categories WHERE name = 'Restaurante'), capacity = 40, location = 'Terraza', is_reservable = false, is_active = true WHERE name = 'Casa de la Cerveza';

UPDATE activities SET image_url = '/images/Casa de la Pasta/casa-pasta.jpg', images = ARRAY['/images/Casa de la Pasta/casa-pasta.jpg', '/images/Casa de la Pasta/casa-pasta-0.jpg', '/images/Casa de la Pasta/casa-pasta-1.jpg']::text[], category_id = (SELECT id FROM activity_categories WHERE name = 'Restaurante'), capacity = 60, location = NULL, is_reservable = true, is_active = true WHERE name = 'Casa de la Pasta';

UPDATE activities SET image_url = '/images/Casa del Café/Casa-cafe.jpg', images = ARRAY['/images/Casa del Café/Casa-cafe.jpg', '/images/Casa del Café/casa-cafe-0.jpg', '/images/Casa del Café/casa-cafe-1.jpg', '/images/Casa del Café/casa-cafe-2.jpg']::text[], category_id = (SELECT id FROM activity_categories WHERE name = 'Restaurante'), capacity = 30, location = 'Jardín', is_reservable = false, is_active = true WHERE name = 'Casa del Café';

UPDATE activities SET image_url = '/images/Casa del Chocolate/casa-chocolate.jpg', images = ARRAY['/images/Casa del Chocolate/casa-chocolate.jpg', '/images/Casa del Chocolate/casa-chocolate-0.jpg', '/images/Casa del Chocolate/casa-chocolate-1.jpg']::text[], category_id = (SELECT id FROM activity_categories WHERE name = 'Restaurante'), capacity = 35, location = 'Edificio Social', is_reservable = false, is_active = true WHERE name = 'Casa del Chocolate';

UPDATE activities SET image_url = '/images/Casa del Helado/Casa-helado.jpg', images = ARRAY['/images/Casa del Helado/Casa-helado.jpg', '/images/Casa del Helado/Casa-helado-0.jpg', '/images/Casa del Helado/Casa-helado-1.jpg', '/images/Casa del Helado/Casa-helado-2.jpg', '/images/Casa del Helado/Casa-helado-3.jpg', '/images/Casa del Helado/Casa-helado-4.jpg']::text[], category_id = (SELECT id FROM activity_categories WHERE name = 'Restaurante'), capacity = 30, location = 'Edificio Social', is_reservable = false, is_active = true WHERE name = 'Casa del Helado';

UPDATE activities SET image_url = '/images/Casa del Mar/casa-mar-0.jpg', images = ARRAY['/images/Casa del Mar/casa-mar-0.jpg', '/images/Casa del Mar/casa-mar-1.jpg', '/images/Casa del Mar/casa-mar-2.jpg', '/images/Casa del Mar/casa-mar-3.jpg', '/images/Casa del Mar/casa-mar-4.jpg']::text[], category_id = (SELECT id FROM activity_categories WHERE name = 'Restaurante'), capacity = 50, location = 'Malecón', is_reservable = true, is_active = true WHERE name = 'Casa del Mar';

UPDATE activities SET image_url = '/images/Casa del Refresco/casa-refresco.jpg', images = ARRAY['/images/Casa del Refresco/casa-refresco.jpg', '/images/Casa del Refresco/casa-refresco0.jpeg']::text[], category_id = (SELECT id FROM activity_categories WHERE name = 'Restaurante'), capacity = 30, location = NULL, is_reservable = false, is_active = true WHERE name = 'Casa del Refresco';

UPDATE activities SET image_url = '/images/Casa del Ron/casa-ron.jpg', images = ARRAY['/images/Casa del Ron/casa-ron.jpg', '/images/Casa del Ron/casa-ron-1.jpg', '/images/Casa del Ron/casa-ron-2.jpg', '/images/Casa del Ron/casa-ron-3.jpg']::text[], category_id = (SELECT id FROM activity_categories WHERE name = 'Restaurante'), capacity = 60, location = NULL, is_reservable = true, is_active = true WHERE name = 'Casa del Ron';

UPDATE activities SET image_url = '/images/Casa la Picadera/casa-laPicadera.jpg', images = ARRAY['/images/Casa la Picadera/casa-laPicadera.jpg', '/images/Casa la Picadera/casa-laPicadera0.jpg', '/images/Casa la Picadera/casa-laPicadera1.jpg', '/images/Casa la Picadera/casa-laPicadera2.jpg', '/images/Casa la Picadera/casa-laPicadera3.jpg']::text[], category_id = (SELECT id FROM activity_categories WHERE name = 'Restaurante'), capacity = 40, location = NULL, is_reservable = false, is_active = true WHERE name = 'Casa la Picadera';

UPDATE activities SET image_url = '/images/Gym/gym.jpg', images = ARRAY['/images/Gym/gym.jpg', '/images/Gym/gym-1.jpg', '/images/Gym/gym-2.jpg', '/images/Gym/gym-3.jpg']::text[], category_id = (SELECT id FROM activity_categories WHERE name = 'Gimnasio'), capacity = 30, location = 'Ala Deportiva', is_reservable = true, is_active = true WHERE name = 'Gym';

UPDATE activities SET image_url = '/images/Pan con/pancon... .jpg', images = ARRAY['/images/Pan con/pancon... .jpg']::text[], category_id = (SELECT id FROM activity_categories WHERE name = 'Restaurante'), capacity = 20, location = NULL, is_reservable = false, is_active = true WHERE name = 'Pan con';

UPDATE activities SET image_url = '/images/Piscina Artificial/piscina.jpg', images = ARRAY['/images/Piscina Artificial/piscina.jpg', '/images/Piscina Artificial/duchas.jpg', '/images/Piscina Artificial/piscina-1.jpg', '/images/Piscina Artificial/piscina-2.jpg', '/images/Piscina Artificial/piscina-3.jpg']::text[], category_id = (SELECT id FROM activity_categories WHERE name = 'Piscina'), capacity = 100, location = 'Ala Deportiva', is_reservable = false, is_active = true WHERE name = 'Piscina Artificial';

UPDATE activities SET image_url = '/images/Piscina Natural/piscina-natural.jpg', images = ARRAY['/images/Piscina Natural/piscina-natural.jpg', '/images/Piscina Natural/piscina-natural-1.jpg', '/images/Piscina Natural/playa-0.jpg', '/images/Piscina Natural/playa-1.jpg', '/images/Piscina Natural/playa-3.jpg', '/images/Piscina Natural/playa.jpg']::text[], category_id = (SELECT id FROM activity_categories WHERE name = 'Piscina'), capacity = 40, location = 'Área Natural', is_reservable = false, is_active = true WHERE name = 'Piscina Natural';

UPDATE activities SET image_url = '/images/Ranchón de Comida Criolla/ranchón-c-criolla.jpg', images = ARRAY['/images/Ranchón de Comida Criolla/ranchón-c-criolla.jpg', '/images/Ranchón de Comida Criolla/ranchón-c-criolla0.jpg', '/images/Ranchón de Comida Criolla/ranchón-c-criolla1.jpg', '/images/Ranchón de Comida Criolla/ranchón-c-criolla2.jpg', '/images/Ranchón de Comida Criolla/ranchón-c-criolla3.jpg', '/images/Ranchón de Comida Criolla/ranchón-c-criolla4.jpg']::text[], category_id = (SELECT id FROM activity_categories WHERE name = 'Restaurante'), capacity = 80, location = NULL, is_reservable = false, is_active = true WHERE name = 'Ranchón de Comida Criolla';

UPDATE activities SET image_url = '/images/Restaurante de Comida Criolla/comida-cubana.jpg', images = ARRAY['/images/Restaurante de Comida Criolla/comida-cubana.jpg', '/images/Restaurante de Comida Criolla/comida-cubana-0.jpg']::text[], category_id = (SELECT id FROM activity_categories WHERE name = 'Restaurante'), capacity = 60, location = 'Casa Principal', is_reservable = true, is_active = true WHERE name = 'Restaurante de Comida Criolla';

UPDATE activities SET image_url = '/images/Sala de Juegos/Sala-de-juegos.jpg', images = ARRAY['/images/Sala de Juegos/Sala-de-juegos.jpg', '/images/Sala de Juegos/Sala-de-juegos-1.jpg', '/images/Sala de Juegos/Sala-de-juegos-2.jpg', '/images/Sala de Juegos/saladejuegos.jpeg', '/images/Sala de Juegos/saladejuegos0.jpeg', '/images/Sala de Juegos/saladejuegos1.jpeg', '/images/Sala de Juegos/saladejuegos10.jpeg', '/images/Sala de Juegos/saladejuegos11.jpeg', '/images/Sala de Juegos/saladejuegos2.jpeg', '/images/Sala de Juegos/saladejuegos3.jpeg', '/images/Sala de Juegos/saladejuegos4.jpeg', '/images/Sala de Juegos/saladejuegos5.jpeg', '/images/Sala de Juegos/saladejuegos6 .jpeg', '/images/Sala de Juegos/saladejuegos7.jpeg', '/images/Sala de Juegos/saladejuegos8.jpeg', '/images/Sala de Juegos/saladejuegos9.jpeg']::text[], category_id = (SELECT id FROM activity_categories WHERE name = 'Juegos'), capacity = 20, location = 'Edificio Social', is_reservable = true, is_active = true WHERE name = 'Sala de Juegos';

UPDATE activities SET image_url = '/images/Salón de Belleza/Salon-de-belleza.jpeg', images = ARRAY['/images/Salón de Belleza/Salon-de-belleza.jpeg', '/images/Salón de Belleza/WhatsApp Image 2026-11-09 at 11.55.44.jpeg', '/images/Salón de Belleza/WhatsApp Image 2026-11-09 at 11.55.50.jpeg', '/images/Salón de Belleza/WhatsApp Image 2026-11-09 at 11.55.53.jpeg', '/images/Salón de Belleza/WhatsApp Image 2026-11-09 at 11.55.55.jpeg']::text[], category_id = (SELECT id FROM activity_categories WHERE name = 'Belleza'), capacity = 10, location = 'Edificio Social', is_reservable = true, is_active = true WHERE name = 'Salón de Belleza';

UPDATE activities SET image_url = '/images/Spa/WhatsApp Image 2026-11-09 at 11.54.39.jpeg', images = ARRAY['/images/Spa/WhatsApp Image 2026-11-09 at 11.54.39.jpeg', '/images/Spa/WhatsApp Image 2026-11-09 at 11.54.45.jpeg', '/images/Spa/WhatsApp Image 2026-11-09 at 11.54.50.jpeg', '/images/Spa/WhatsApp Image 2026-11-09 at 11.54.52.jpeg', '/images/Spa/WhatsApp Image 2026-11-09 at 11.54.53.jpeg', '/images/Spa/WhatsApp Image 2026-11-09 at 11.54.54.jpeg']::text[], category_id = (SELECT id FROM activity_categories WHERE name = 'Belleza'), capacity = 10, location = NULL, is_reservable = true, is_active = true WHERE name = 'Spa';

-- Remove places that no longer have a folder (reservations keep their history).
DELETE FROM activities WHERE name NOT IN ('Casa de la Cerveza', 'Casa de la Pasta', 'Casa del Café', 'Casa del Chocolate', 'Casa del Helado', 'Casa del Mar', 'Casa del Refresco', 'Casa del Ron', 'Casa la Picadera', 'Gym', 'Pan con', 'Piscina Artificial', 'Piscina Natural', 'Ranchón de Comida Criolla', 'Restaurante de Comida Criolla', 'Sala de Juegos', 'Salón de Belleza', 'Spa') AND NOT EXISTS (SELECT 1 FROM reservations r WHERE r.activity_id = activities.id);
UPDATE activities SET is_active = false, is_reservable = false WHERE name NOT IN ('Casa de la Cerveza', 'Casa de la Pasta', 'Casa del Café', 'Casa del Chocolate', 'Casa del Helado', 'Casa del Mar', 'Casa del Refresco', 'Casa del Ron', 'Casa la Picadera', 'Gym', 'Pan con', 'Piscina Artificial', 'Piscina Natural', 'Ranchón de Comida Criolla', 'Restaurante de Comida Criolla', 'Sala de Juegos', 'Salón de Belleza', 'Spa');

-- Hide categories left without activities.
UPDATE activity_categories c SET is_active = false WHERE NOT EXISTS (SELECT 1 FROM activities a WHERE a.category_id = c.id AND a.is_active = true);
