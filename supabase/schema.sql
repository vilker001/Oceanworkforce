-- =====================================================
-- OCEAN GROUP MANAGEMENT SUITE - DATABASE SCHEMA
-- =====================================================
-- This file contains the complete database schema for Supabase
-- Run this in the Supabase SQL Editor: https://app.supabase.com/project/_/sql

-- =====================================================
-- 1. USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN (
    'Gestor de Projectos',
    'Gestor Criativo',
    'Gestor de Parceiros e Clientes',
    'Gestor de Trading e Negociação',
    'Designer',
    'Promoter de Venda',
    'Videomaker',
    'Colaborador'
  )),
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies
-- Policies
DROP POLICY IF EXISTS "Users can read all users" ON users;
CREATE POLICY "Users can read all users" ON users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- 2. TASKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  project TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Backlog' CHECK (status IN ('Backlog', 'ToDo', 'InProgress', 'Review', 'Done')),
  priority TEXT NOT NULL DEFAULT 'MÉDIA' CHECK (priority IN ('BAIXA', 'MÉDIA', 'ALTA', 'CRÍTICA')),
  responsible_id UUID REFERENCES users(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  due_date DATE NOT NULL,
  objectives JSONB DEFAULT '[]'::jsonb,
  completion_report TEXT,
  manager_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can read tasks" ON tasks
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Managers can create tasks" ON tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('Gestor de Projectos', 'Gestor Criativo', 'Gestor de Parceiros e Clientes', 'Gestor de Trading e Negociação')
    )
  );

CREATE POLICY "GP or responsible can update tasks" ON tasks
  FOR UPDATE USING (
    auth.uid() = responsible_id OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Gestor de Projectos')
  );

CREATE POLICY "GP can delete tasks" ON tasks
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Gestor de Projectos')
  );

-- =====================================================
-- 3. CLIENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company_phone TEXT,
  internal_contact TEXT,
  internal_contact_phone TEXT,
  internal_contact_role TEXT,
  client_responsible_name TEXT,
  client_responsible_phone TEXT,
  status TEXT NOT NULL DEFAULT 'Novo Lead' CHECK (status IN (
    'Novo Lead',
    'Em Contacto',
    'Proposta Enviada',
    'Consultoria Marcada',
    'Convertido',
    'Repescagem',
    'Perdido'
  )),
  responsible_id UUID REFERENCES users(id) ON DELETE SET NULL,
  services TEXT[] DEFAULT '{}',
  location TEXT CHECK (location IN ('Maputo Cidade', 'Maputo Província')),
  provenance TEXT CHECK (provenance IN ('Redes Sociais', 'Google', 'Andando pela cidade', 'Recomendação', 'Outro')),
  last_activity TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read clients" ON clients
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create clients" ON clients
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "GP or responsible can update clients" ON clients
  FOR UPDATE USING (
    auth.uid() = responsible_id OR
    responsible_id IS NULL OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Gestor de Projectos')
  );

-- =====================================================
-- 4. CALENDAR EVENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Reunião', 'Feriado', 'Folga', 'Geral')),
  description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can read events" ON calendar_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('Gestor de Projectos', 'Gestor Criativo', 'Gestor de Parceiros e Clientes', 'Gestor de Trading e Negociação')
    )
  );

CREATE POLICY "Managers can create events" ON calendar_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('Gestor de Projectos', 'Gestor Criativo', 'Gestor de Parceiros e Clientes', 'Gestor de Trading e Negociação')
    )
  );

CREATE POLICY "Managers can update events" ON calendar_events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('Gestor de Projectos', 'Gestor Criativo', 'Gestor de Parceiros e Clientes', 'Gestor de Trading e Negociação')
    )
  );

CREATE POLICY "Managers can delete events" ON calendar_events
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('Gestor de Projectos', 'Gestor Criativo', 'Gestor de Parceiros e Clientes', 'Gestor de Trading e Negociação')
    )
  );

-- =====================================================
-- 5. TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  date DATE NOT NULL,
  category TEXT NOT NULL,
  value DECIMAL(12, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'investment')),
  status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pago', 'Pendente', 'Recebido')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only GP can manage transactions" ON transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Gestor de Projectos')
  );

-- =====================================================
-- 6. TRIGGERS FOR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_tasks_responsible ON tasks(responsible_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_clients_responsible ON clients(responsible_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(date);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- =====================================================
-- 8. VIEWS FOR CONVENIENCE
-- =====================================================

-- View: Tasks with user details
CREATE OR REPLACE VIEW tasks_with_users AS
SELECT 
  t.*,
  u.name as responsible_name,
  u.avatar as responsible_avatar,
  u.role as responsible_role
FROM tasks t
LEFT JOIN users u ON t.responsible_id = u.id;

-- View: Clients with user details
CREATE OR REPLACE VIEW clients_with_users AS
SELECT 
  c.*,
  u.name as responsible_name,
  u.avatar as responsible_avatar
FROM clients c
LEFT JOIN users u ON c.responsible_id = u.id;

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- Next steps:
-- 1. Copy your Supabase URL and anon key to .env.local
-- 2. Test the connection by running the app
-- 3. Create your first user via the onboarding flow
