-- =====================================================
-- FIX MISSING COLUMNS & VIEWS SCRIPT
-- Execute isto no SQL Editor do Supabase
-- =====================================================

-- 1. ADICIONAR COLUNAS EM FALTA NAS TAREFAS E CLIENTES
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS delegated_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'Média' CHECK (urgency IN ('Baixa', 'Média', 'Alta', 'Crítica'));

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS next_follow_up_date DATE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS internal_contact TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS internal_contact_phone TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS internal_contact_role TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS client_responsible_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS client_responsible_phone TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS company_phone TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS responsible_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 2. RECRIAR VISTA DOS CLIENTES
CREATE OR REPLACE VIEW public.clients_with_users AS
SELECT 
  c.*,
  u.name AS responsible_name,
  u.avatar AS responsible_avatar
FROM public.clients c
LEFT JOIN public.users u ON c.responsible_id = u.id;

-- 3. RECRIAR VISTA DAS TAREFAS
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

-- 4. DAR PERMISSÕES
GRANT SELECT ON public.clients_with_users TO authenticated;
GRANT SELECT ON public.tasks_with_users TO authenticated;
