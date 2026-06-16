-- =====================================================
-- OCEAN WORKFORCE - MIGRATION V3
-- =====================================================
-- Run this after migration_v2.sql in Supabase SQL Editor
-- =====================================================

-- 1. FINANCIAL SETTINGS TABLE (missing from v2)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.financial_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initial_balance DECIMAL(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MT',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default record if none exists
INSERT INTO public.financial_settings (initial_balance, currency)
SELECT 0, 'MT' WHERE NOT EXISTS (SELECT 1 FROM public.financial_settings);

ALTER TABLE public.financial_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow GP to manage financial_settings"
  ON public.financial_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Gestor de Projetos')
  );

CREATE POLICY "Allow authenticated read financial_settings"
  ON public.financial_settings FOR SELECT TO authenticated USING (true);

-- 2. FIX PHOTO SESSIONS RLS - Allow Gestor Técnico to also write
-- =====================================================
DROP POLICY IF EXISTS "Allow photographers and GP to write photo_sessions" ON public.photo_sessions;

CREATE POLICY "Allow photographers and managers to write photo_sessions"
  ON public.photo_sessions FOR ALL USING (
    auth.uid() = photographer_id OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('Gestor de Projetos', 'Gestor Técnico')
    )
  );

-- 3. ADD MISSING COLUMNS TO CLIENTS TABLE
-- =====================================================
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS next_follow_up_date DATE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS internal_contact TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS internal_contact_phone TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS internal_contact_role TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS client_responsible_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS client_responsible_phone TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS company_phone TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS responsible_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 4. CREATE CLIENTS_WITH_USERS VIEW (if not exists)
-- =====================================================
CREATE OR REPLACE VIEW public.clients_with_users AS
SELECT 
  c.*,
  u.name AS responsible_name,
  u.avatar AS responsible_avatar
FROM public.clients c
LEFT JOIN public.users u ON c.responsible_id = u.id;

-- 5. CREATE TASKS_WITH_USERS VIEW (if not exists)
-- =====================================================
CREATE OR REPLACE VIEW public.tasks_with_users AS
SELECT 
  t.*,
  u.name AS responsible_name,
  u.avatar AS responsible_avatar,
  u.role AS responsible_role,
  d.name AS delegated_by_name
FROM public.tasks t
LEFT JOIN public.users u ON t.responsible_id = u.id
LEFT JOIN public.users d ON t.delegated_by = d.id;

-- Grant view access
GRANT SELECT ON public.clients_with_users TO authenticated;
GRANT SELECT ON public.tasks_with_users TO authenticated;

-- 6. ADD URGENCY FIELD TO TASKS
-- =====================================================
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'Média' CHECK (urgency IN ('Baixa', 'Média', 'Alta', 'Crítica'));

-- 7. ENSURE TEAM_GOALS UPSERT WORKS (add unique constraint if missing)
-- =====================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'team_goals_month_key'
  ) THEN
    ALTER TABLE public.team_goals ADD CONSTRAINT team_goals_month_key UNIQUE (month);
  END IF;
END $$;
