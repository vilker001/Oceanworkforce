-- =====================================================
-- OCEAN WORKFORCE - MIGRATION V2 (SCHEMA UPDATE)
-- =====================================================
-- Run this in the Supabase SQL Editor:
-- https://app.supabase.com/project/_/sql
-- =====================================================

-- 1. CLEAN UP OLD CONSTRAINTS AND UPDATE ROLES IN USERS TABLE
-- =====================================================
-- Drop old check constraint if it exists (usually anonymous, so we alter/recreate or safely filter)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN (
  'Gestor de Projetos',
  'Gestor Técnico',
  'Gestor de Trading',
  'Fotógrafo',
  'Promoter de Venda',
  'Colaborador'
));

-- Add must_change_password column
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT TRUE;

-- 2. SYSTEM SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_rate DECIMAL(10,4) NOT NULL DEFAULT 68.33,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings if not exists
INSERT INTO public.system_settings (exchange_rate)
SELECT 68.33 WHERE NOT EXISTS (SELECT 1 FROM public.system_settings);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read system_settings" 
  ON public.system_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow GP and managers to update system_settings" 
  ON public.system_settings FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('Gestor de Projetos', 'Gestor Técnico', 'Gestor de Trading')
    )
  );

-- 3. SERVICE CATALOG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_type TEXT NOT NULL CHECK (catalog_type IN ('BMS Studio', 'Ocean Group')),
  name TEXT NOT NULL,
  description TEXT,
  price_mt DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read service_catalog" 
  ON public.service_catalog FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow GP to write service_catalog" 
  ON public.service_catalog FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Gestor de Projetos')
  );

-- Insert default catalog items if empty
INSERT INTO public.service_catalog (catalog_type, name, description, price_mt)
SELECT 'BMS Studio', 'Sessão Retrato Tradicional', 'Sessão de fotos clássica em estúdio', 5000.00
WHERE NOT EXISTS (SELECT 1 FROM public.service_catalog);

INSERT INTO public.service_catalog (catalog_type, name, description, price_mt)
SELECT 'Ocean Group', 'Gestão de Redes Sociais', 'Planeamento e publicação em redes sociais', 15000.00
WHERE NOT EXISTS (SELECT 1 FROM public.service_catalog WHERE catalog_type = 'Ocean Group');

-- 4. FIXED EXPENSES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.fixed_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  value_mt DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.fixed_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow GP to manage fixed_expenses" 
  ON public.fixed_expenses FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Gestor de Projetos')
  );

CREATE POLICY "Allow managers to read fixed_expenses" 
  ON public.fixed_expenses FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('Gestor de Projetos', 'Gestor Técnico', 'Gestor de Trading')
    )
  );

-- 5. UPDATE TASKS TABLE
-- =====================================================
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS relevance INT DEFAULT 3 CHECK (relevance >= 1 AND relevance <= 5);
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS delegated_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Safely update status constraints
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('Backlog', 'ToDo', 'InProgress', 'Review', 'Done'));

-- 6. PROJECTS AND PROJECT STAGES TABLES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('interno', 'externo')),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Concluido')),
  completion_report JSONB,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.project_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  objectives JSONB DEFAULT '[]'::jsonb,
  start_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'A Fazer' CHECK (status IN ('A Fazer', 'Em Progresso', 'Concluido')),
  relevance INT DEFAULT 3 CHECK (relevance >= 1 AND relevance <= 5),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_stages ENABLE ROW LEVEL SECURITY;

-- Project policies
CREATE POLICY "Allow authenticated read projects" 
  ON public.projects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow GP and GT to manage projects" 
  ON public.projects FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('Gestor de Projetos', 'Gestor Técnico')
    )
  );

-- Project stage policies
CREATE POLICY "Allow authenticated read project_stages" 
  ON public.project_stages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow GP and GT to manage project_stages" 
  ON public.project_stages FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('Gestor de Projetos', 'Gestor Técnico')
    )
  );

-- 7. UPDATE CLIENTS TABLE & ADD FOLLOW-UPS
-- =====================================================
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS business_value DECIMAL(12,2) DEFAULT 0;

-- Follow-ups Table
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  notes TEXT NOT NULL,
  current_stage TEXT NOT NULL,
  advances_funnel BOOLEAN NOT NULL DEFAULT FALSE,
  next_follow_up_date DATE NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow visible follow_ups to authorized users" 
  ON public.follow_ups FOR SELECT TO authenticated USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('Gestor de Projetos', 'Gestor Técnico', 'Gestor de Trading')
    )
  );

CREATE POLICY "Allow authenticated to insert follow_ups" 
  ON public.follow_ups FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 8. PHOTO SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.photo_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT NOT NULL,
  location_type TEXT NOT NULL CHECK (location_type IN ('estúdio', 'exterior')),
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration_estimated TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  price_mt DECIMAL(12,2) NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Agendada' CHECK (status IN ('Agendada', 'Executada')),
  photographer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.photo_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read photo_sessions" 
  ON public.photo_sessions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow photographers and GP to write photo_sessions" 
  ON public.photo_sessions FOR ALL USING (
    auth.uid() = photographer_id OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Gestor de Projetos')
  );

-- 9. TRADING TRADES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.trading_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset TEXT NOT NULL,
  lot DECIMAL(10,2) NOT NULL,
  stop_loss_usd DECIMAL(12,2) NOT NULL,
  take_profit_usd DECIMAL(12,2) NOT NULL,
  open_date TIMESTAMP WITH TIME ZONE NOT NULL,
  close_date TIMESTAMP WITH TIME ZONE,
  pre_trade_notes TEXT,
  result TEXT CHECK (result IN ('positivo', 'negativo')),
  realized_usd DECIMAL(12,2),
  observation TEXT,
  classification TEXT CHECK (classification IN ('dentro do plano', 'fora do plano', 'violação de regras')),
  exchange_rate DECIMAL(10,4) NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.trading_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow managers to view trading_trades" 
  ON public.trading_trades FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('Gestor de Projetos', 'Gestor Técnico', 'Gestor de Trading')
    )
  );

CREATE POLICY "Allow trading manager and GP to write trading_trades" 
  ON public.trading_trades FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('Gestor de Projetos', 'Gestor de Trading')
    )
  );

-- 10. GAMIFICATION: XP HISTORY, TEAM GOALS AND MONTHLY TITLES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.xp_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  xp_amount INT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.team_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month TEXT NOT NULL UNIQUE, -- 'YYYY-MM'
  target_xp INT NOT NULL,
  current_xp INT NOT NULL DEFAULT 0,
  achieved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.monthly_titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month TEXT NOT NULL, -- 'YYYY-MM'
  title_type TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  xp_awarded INT DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(month, title_type)
);

ALTER TABLE public.xp_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_titles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read xp_history" ON public.xp_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow system/GP write xp_history" ON public.xp_history FOR ALL USING (true);

CREATE POLICY "Allow authenticated read team_goals" ON public.team_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow GP write team_goals" ON public.team_goals FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Gestor de Projetos')
);

CREATE POLICY "Allow authenticated read monthly_titles" ON public.monthly_titles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow system write monthly_titles" ON public.monthly_titles FOR ALL USING (true);

-- 11. USER KPIS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  kpi_name TEXT NOT NULL,
  target_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  actual_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, kpi_name)
);

ALTER TABLE public.user_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read user_kpis" ON public.user_kpis FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow managers to update user_kpis" ON public.user_kpis FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('Gestor de Projetos', 'Gestor Técnico', 'Gestor de Trading')
  )
);

-- 12. CREATE USER HELPER FUNCTION (SECURITY DEFINER)
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_new_user(
  p_email TEXT,
  p_password TEXT,
  p_name TEXT,
  p_role TEXT,
  p_avatar TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
  encrypted_pw TEXT;
BEGIN
  -- Verificar se quem executa é Gestor de Projetos
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'Gestor de Projetos'
  ) THEN
    RAISE EXCEPTION 'Apenas o Gestor de Projetos pode criar utilizadores.';
  END IF;

  -- Criar ID
  new_user_id := gen_random_uuid();
  
  -- Encriptar password (compatível com auth.users do Supabase)
  encrypted_pw := crypt(p_password, gen_salt('bf'));

  -- Inserir no Supabase Auth
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    p_email,
    encrypted_pw,
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('name', p_name, 'role', p_role),
    now(),
    now()
  );

  -- Inserir no perfil público
  INSERT INTO public.users (id, email, name, role, avatar, must_change_password)
  VALUES (new_user_id, p_email, p_name, p_role, p_avatar, true);

  -- Adicionar KPIs padrão para o novo cargo
  IF p_role = 'Fotógrafo' THEN
    INSERT INTO public.user_kpis (user_id, kpi_name, target_score, actual_score) VALUES
      (new_user_id, 'Sessões executadas', 100, 0),
      (new_user_id, 'Taxa de execução (%)', 100, 0),
      (new_user_id, 'Receita individual gerada (MT)', 100, 0);
  ELSIF p_role = 'Promoter de Venda' THEN
    INSERT INTO public.user_kpis (user_id, kpi_name, target_score, actual_score) VALUES
      (new_user_id, 'Leads Contactados', 100, 0),
      (new_user_id, 'Leads Qualificados', 100, 0),
      (new_user_id, 'Taxa de Qualificação (%)', 100, 0),
      (new_user_id, 'Reuniões Agendadas', 100, 0);
  ELSIF p_role = 'Colaborador' THEN
    INSERT INTO public.user_kpis (user_id, kpi_name, target_score, actual_score) VALUES
      (new_user_id, 'Eficiência de Tarefas', 100, 0);
  END IF;

  RETURN new_user_id;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.create_new_user(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 13. UPDATE USER ADMIN HELPER FUNCTION (SECURITY DEFINER)
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_user_admin(
  p_user_id UUID,
  p_email TEXT,
  p_name TEXT,
  p_role TEXT,
  p_avatar TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se quem executa é Gestor de Projetos
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'Gestor de Projetos'
  ) THEN
    RAISE EXCEPTION 'Apenas o Gestor de Projetos pode atualizar dados administrativos de utilizadores.';
  END IF;

  -- Atualizar auth.users
  UPDATE auth.users
  SET email = p_email,
      raw_user_meta_data = jsonb_build_object('name', p_name, 'role', p_role)
  WHERE id = p_user_id;

  -- Atualizar public.users
  UPDATE public.users
  SET email = p_email,
      name = p_name,
      role = p_role,
      avatar = p_avatar
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_admin(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

