/*
  # Crear perfil de supervisor para marcoarraiz@gmail.com

  1. Buscar el ID del usuario en auth.users
  2. Crear el perfil en user_profiles con rol supervisor
  3. Verificar que el perfil se creó correctamente
*/

-- Crear perfil de supervisor para marcoarraiz@gmail.com
INSERT INTO user_profiles (id, email, full_name, role)
SELECT 
  id,
  'marcoarraiz@gmail.com',
  'Marco Arraiz',
  'supervisor'
FROM auth.users 
WHERE email = 'marcoarraiz@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = 'Marco Arraiz',
  role = 'supervisor';

-- Verificar que el perfil se creó correctamente
SELECT id, email, full_name, role, created_at 
FROM user_profiles 
WHERE email = 'marcoarraiz@gmail.com';