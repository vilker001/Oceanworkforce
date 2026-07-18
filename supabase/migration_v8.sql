-- =====================================================
-- OCEAN WORKFORCE - MIGRATION V8 (STAGES RESPONSIBLE)
-- =====================================================
-- Execute isto no SQL Editor do Supabase
-- =====================================================

-- 1. Adicionar responsible_id e delegated_by à tabela project_stages
ALTER TABLE public.project_stages ADD COLUMN IF NOT EXISTS responsible_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.project_stages ADD COLUMN IF NOT EXISTS delegated_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
