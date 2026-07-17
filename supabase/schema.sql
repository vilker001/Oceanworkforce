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

-- =====================================================
-- 9. INVOICING MODULE
-- =====================================================

-- Add NUIT to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS nuit TEXT;

-- 9.1 COMPANY PROFILE
CREATE TABLE IF NOT EXISTS company_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  nuit TEXT NOT NULL,
  contacto TEXT NOT NULL,
  endereco TEXT NOT NULL,
  instagram TEXT,
  logo_url TEXT,
  forma_pagamento_titulo TEXT,
  banco TEXT,
  nib TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE company_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read company profile" ON company_profile FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Managers can update company profile" ON company_profile FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Gestor de Projectos'))
);

-- 9.2 INVOICES
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE RESTRICT NOT NULL,
  emitido_por UUID REFERENCES users(id) ON DELETE SET NULL,
  data_emissao DATE DEFAULT CURRENT_DATE,
  subtotal DECIMAL(12, 2) NOT NULL,
  iva DECIMAL(12, 2) NOT NULL,
  total DECIMAL(12, 2) NOT NULL,
  estado TEXT NOT NULL DEFAULT 'emitida' CHECK (estado IN ('emitida', 'paga', 'anulada')),
  pdf_url TEXT,
  forma_pagamento TEXT,
  validade_dias INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read invoices" ON invoices FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create invoices" ON invoices FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Managers can update invoices" ON invoices FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Gestor de Projectos'))
);

-- 9.3 INVOICE ITEMS
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  descricao TEXT NOT NULL,
  quantidade DECIMAL(10, 2) DEFAULT 1 NOT NULL,
  preco_unitario DECIMAL(12, 2) NOT NULL,
  total_linha DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read invoice items" ON invoice_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create invoice items" ON invoice_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 9.4 INVOICE SEQUENCE
CREATE TABLE IF NOT EXISTS invoice_sequence (
  ano INT PRIMARY KEY,
  ultimo_numero INT DEFAULT 0
);

-- Trigger for updated_at
CREATE TRIGGER update_company_profile_updated_at BEFORE UPDATE ON company_profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RPC FUNCTION TO GENERATE CODE
CREATE OR REPLACE FUNCTION gerar_codigo_factura()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ano INT;
  v_ultimo_numero INT;
  v_codigo TEXT;
BEGIN
  v_ano := extract(year from current_date);
  
  INSERT INTO invoice_sequence (ano, ultimo_numero)
  VALUES (v_ano, 1)
  ON CONFLICT (ano) DO UPDATE
  SET ultimo_numero = invoice_sequence.ultimo_numero + 1
  RETURNING ultimo_numero INTO v_ultimo_numero;

  v_codigo := 'FT' || v_ano || '/' || LPAD(v_ultimo_numero::TEXT, 4, '0');
  
  RETURN v_codigo;
END;
$$;

