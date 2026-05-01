-- Stigg OS Authentication and Access Control Migration

-- Create schema
CREATE SCHEMA IF NOT EXISTS stigg;

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS stigg.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'supervisor', 'guard', 'client')),
  org_id TEXT NOT NULL,
  client_id TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles junction table for fine-grained permissions
CREATE TABLE IF NOT EXISTS stigg.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, role_name)
);

-- Create trigger to auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION stigg.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO stigg.user_profiles (id, email, full_name, role, org_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'guard'),
    COALESCE(NEW.raw_user_meta_data->>'org_id', 'default-org')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION stigg.handle_new_user();

-- Enable RLS on user_profiles
ALTER TABLE stigg.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: users can read own profile
CREATE POLICY "Users can read own profile"
  ON stigg.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Create RLS policy: admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON stigg.user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stigg.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policy: admins can update profiles
CREATE POLICY "Admins can update profiles"
  ON stigg.user_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM stigg.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policy: admins can insert profiles
CREATE POLICY "Admins can insert profiles"
  ON stigg.user_profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stigg.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    ) OR
    auth.uid() = id
  );

-- Enable RLS on user_roles
ALTER TABLE stigg.user_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_roles
CREATE POLICY "Admins can manage roles"
  ON stigg.user_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM stigg.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Sample data: Insert demo users
-- First, we need to use Supabase auth API to create users,
-- but we can prepare the profiles for manual user creation

-- Note: Demo users should be created via Supabase Auth UI or API:
-- 1. admin@stigg.ca / demo123 (role: admin)
-- 2. client@northview.ca / demo123 (role: client)

-- Then insert their profiles:
-- INSERT INTO stigg.user_profiles (id, email, full_name, role, org_id, client_id)
-- VALUES
--   ('00000000-0000-0000-0000-000000000001', 'admin@stigg.ca', 'Admin User', 'admin', 'stigg-org', NULL),
--   ('00000000-0000-0000-0000-000000000002', 'client@northview.ca', 'Client User', 'client', 'northview-org', 'northview-client-1');

-- Sample RLS policy pattern for data tables (example for guards)
-- This shows how to implement org_id-based filtering:
-- CREATE POLICY "Users can access their org's guards"
--   ON public.guards
--   FOR SELECT
--   USING (
--     org_id IN (
--       SELECT org_id FROM stigg.user_profiles WHERE id = auth.uid()
--     )
--   );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON stigg.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_org_id ON stigg.user_profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON stigg.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON stigg.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_name ON stigg.user_roles(role_name);
