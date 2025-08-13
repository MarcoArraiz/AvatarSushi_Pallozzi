/*
  # Agregar tabla de locales comerciales

  1. Nueva tabla
    - `locations` - Tabla para almacenar los locales comerciales
      - `id` (uuid, primary key)
      - `name` (text) - Nombre del local
      - `address` (text) - Dirección del local
      - `created_at` (timestamp)

  2. Datos iniciales
    - Avatar Sushi - Ñuñoa
    - Pallozzi - Ñuñoa
    - Avatar Sushi - La Reina
    - Pallozzi - La Reina

  3. Modificar tabla shifts
    - Agregar columna `location_id` para asociar turnos con locales

  4. Seguridad
    - Enable RLS en `locations`
    - Políticas para supervisores y garzones
*/

-- Crear tabla de locales
CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Políticas para locales
CREATE POLICY "Authenticated users can read locations"
  ON locations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Supervisors can manage locations"
  ON locations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'supervisor'
    )
  );

-- Insertar los 4 locales iniciales
INSERT INTO locations (name, address) VALUES
  ('Avatar Sushi - Ñuñoa', 'Ñuñoa, Santiago'),
  ('Pallozzi - Ñuñoa', 'Ñuñoa, Santiago'),
  ('Avatar Sushi - La Reina', 'La Reina, Santiago'),
  ('Pallozzi - La Reina', 'La Reina, Santiago')
ON CONFLICT DO NOTHING;

-- Agregar columna location_id a la tabla shifts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shifts' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE shifts ADD COLUMN location_id uuid REFERENCES locations(id);
  END IF;
END $$;

-- Asignar un local por defecto a los turnos existentes (Avatar Sushi - Ñuñoa)
UPDATE shifts 
SET location_id = (SELECT id FROM locations WHERE name = 'Avatar Sushi - Ñuñoa' LIMIT 1)
WHERE location_id IS NULL;