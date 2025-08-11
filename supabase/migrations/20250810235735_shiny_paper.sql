/*
  # Initial Schema for Restaurant Protocol Management

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `full_name` (text)
      - `role` (text, check constraint for 'supervisor' or 'garzon')
      - `created_at` (timestamp)
    
    - `shifts`
      - `id` (uuid, primary key)
      - `date` (date)
      - `type` (text, check constraint for 'apertura' or 'cierre')
      - `area` (text, default 'salon')
      - `assigned_users` (text array)
      - `created_at` (timestamp)
    
    - `tasks`
      - `id` (uuid, primary key)
      - `shift_id` (uuid, foreign key to shifts)
      - `text` (text)
      - `category` (text)
      - `subcategory` (text)
      - `status` (text, check constraint for 'pending' or 'completed')
      - `completed_by` (uuid, foreign key to user_profiles)
      - `completed_at` (timestamp)
      - `created_at` (timestamp)
    
    - `incidents`
      - `id` (uuid, primary key)
      - `task_id` (uuid, foreign key to tasks)
      - `shift_id` (uuid, foreign key to shifts)
      - `reported_by` (uuid, foreign key to user_profiles)
      - `note` (text)
      - `reported_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access control
    - Supervisors can access all data
    - Garzones can only access their assigned shifts and related data
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('supervisor', 'garzon')),
  created_at timestamptz DEFAULT now()
);

-- Create shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  type text NOT NULL CHECK (type IN ('apertura', 'cierre')),
  area text NOT NULL DEFAULT 'salon',
  assigned_users text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(date, type, area)
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  text text NOT NULL,
  category text NOT NULL,
  subcategory text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  completed_by uuid REFERENCES user_profiles(id),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create incidents table
CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  shift_id uuid NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  reported_by uuid NOT NULL REFERENCES user_profiles(id),
  note text NOT NULL,
  reported_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- Policies for user_profiles
CREATE POLICY "Users can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Supervisors can manage all profiles"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'supervisor'
    )
  );

-- Policies for shifts
CREATE POLICY "Supervisors can manage all shifts"
  ON shifts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'supervisor'
    )
  );

CREATE POLICY "Garzones can read assigned shifts"
  ON shifts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'supervisor'
    )
    OR auth.uid()::text = ANY(assigned_users)
  );

-- Policies for tasks
CREATE POLICY "Supervisors can manage all tasks"
  ON tasks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'supervisor'
    )
  );

CREATE POLICY "Garzones can read and update assigned shift tasks"
  ON tasks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'supervisor'
    )
    OR EXISTS (
      SELECT 1 FROM shifts
      WHERE shifts.id = tasks.shift_id
      AND auth.uid()::text = ANY(shifts.assigned_users)
    )
  );

-- Policies for incidents
CREATE POLICY "Supervisors can manage all incidents"
  ON incidents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'supervisor'
    )
  );

CREATE POLICY "Garzones can manage incidents for assigned shifts"
  ON incidents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'supervisor'
    )
    OR EXISTS (
      SELECT 1 FROM shifts
      WHERE shifts.id = incidents.shift_id
      AND auth.uid()::text = ANY(shifts.assigned_users)
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shifts_date_type ON shifts(date, type);
CREATE INDEX IF NOT EXISTS idx_tasks_shift_id ON tasks(shift_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_incidents_task_id ON incidents(task_id);
CREATE INDEX IF NOT EXISTS idx_incidents_shift_id ON incidents(shift_id);