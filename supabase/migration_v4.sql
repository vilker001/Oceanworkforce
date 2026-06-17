-- =====================================================
-- OCEAN WORKFORCE - MIGRATION V4
-- =====================================================
-- Execute isto no SQL Editor do Supabase para adicionar as novas colunas
-- =====================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS employee_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gender TEXT;
