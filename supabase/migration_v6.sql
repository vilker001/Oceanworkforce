-- =====================================================
-- OCEAN WORKFORCE - MIGRATION V6 (FIX PROMOTOR)
-- =====================================================
-- Execute isto no SQL Editor do Supabase para corrigir
-- o valor do ENUM de "Promoter de Venda" → "Promotor de Venda"
-- =====================================================

-- 1. Renomear o valor no tipo ENUM user_role
ALTER TYPE user_role RENAME VALUE 'Promoter de Venda' TO 'Promotor de Venda';

-- 2. Atualizar todos os utilizadores existentes que têm o valor antigo
UPDATE public.users
SET role = 'Promotor de Venda'
WHERE role = 'Promoter de Venda';

-- Verificação (opcional)
SELECT id, name, role FROM public.users WHERE role ILIKE '%promotor%';
