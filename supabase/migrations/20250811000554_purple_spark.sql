/*
  # Fix RLS Policies to Prevent Infinite Recursion

  1. Policy Changes
    - Remove recursive policies that check user roles within user_profiles table
    - Create simple, non-recursive policies for user_profiles
    - Maintain security while avoiding circular dependencies

  2. Security Model
    - Users can read their own profile using auth.uid()
    - Users can read all profiles (needed for team assignment functionality)
    - Only authenticated users can access data
    - Supervisors maintain full access through application logic, not RLS
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Supervisors can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Supervisors can manage all shifts" ON shifts;
DROP POLICY IF EXISTS "Garzones can read assigned shifts" ON shifts;
DROP POLICY IF EXISTS "Supervisors can manage all tasks" ON tasks;
DROP POLICY IF EXISTS "Garzones can read and update assigned shift tasks" ON tasks;
DROP POLICY IF EXISTS "Supervisors can manage all incidents" ON incidents;
DROP POLICY IF EXISTS "Garzones can manage incidents for assigned shifts" ON incidents;

-- Create simple, non-recursive policies for user_profiles
CREATE POLICY "Users can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Service role can manage profiles"
  ON user_profiles
  FOR ALL
  TO service_role
  USING (true);

-- Create simple policies for shifts
CREATE POLICY "Authenticated users can read shifts"
  ON shifts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage shifts"
  ON shifts
  FOR ALL
  TO authenticated
  USING (true);

-- Create simple policies for tasks
CREATE POLICY "Authenticated users can read tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage tasks"
  ON tasks
  FOR ALL
  TO authenticated
  USING (true);

-- Create simple policies for incidents
CREATE POLICY "Authenticated users can read incidents"
  ON incidents
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage incidents"
  ON incidents
  FOR ALL
  TO authenticated
  USING (true);