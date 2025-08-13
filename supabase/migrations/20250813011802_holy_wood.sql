/*
  # Actualizar tabla shifts para soporte de locales

  1. Modificaciones
    - Hacer location_id NOT NULL en shifts
    - Actualizar constraint único para incluir location_id
    - Asignar shifts existentes al primer local por defecto

  2. Seguridad
    - Mantener políticas RLS existentes
*/

-- Primero, asignar todos los shifts existentes al primer local
UPDATE shifts 
SET location_id = (SELECT id FROM locations ORDER BY created_at LIMIT 1)
WHERE location_id IS NULL;

-- Hacer location_id NOT NULL
ALTER TABLE shifts 
ALTER COLUMN location_id SET NOT NULL;

-- Eliminar constraint único anterior
ALTER TABLE shifts 
DROP CONSTRAINT IF EXISTS shifts_date_type_area_key;

-- Crear nuevo constraint único que incluya location_id
ALTER TABLE shifts 
ADD CONSTRAINT shifts_date_type_area_location_key 
UNIQUE (date, type, area, location_id);