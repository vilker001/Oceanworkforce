-- =====================================================
-- OCEAN WORKFORCE - MIGRATION V7 (FIX BLOQUEIO/DESBLOQUEIO)
-- =====================================================
-- Execute isto no SQL Editor do Supabase
-- =====================================================

-- 1. Adicionar a coluna is_blocked à tabela de utilizadores para a UI conseguir ler
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;

-- 2. Atualizar a função de bloquear/desbloquear para sincronizar ambas as tabelas
CREATE OR REPLACE FUNCTION public.toggle_block_user(p_user_id UUID, p_block BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar permissão (apenas Gestores)
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role ILIKE '%Gestor%'
  ) THEN
    RAISE EXCEPTION 'Apenas gestores podem bloquear/desbloquear utilizadores.';
  END IF;

  IF p_block THEN
    -- Banir na Auth (Supabase)
    UPDATE auth.users SET banned_until = '2099-01-01'::timestamp WHERE id = p_user_id;
    -- Marcar como bloqueado na tabela pública
    UPDATE public.users SET is_blocked = TRUE WHERE id = p_user_id;
  ELSE
    -- Remover ban na Auth
    UPDATE auth.users SET banned_until = NULL WHERE id = p_user_id;
    -- Desmarcar na tabela pública
    UPDATE public.users SET is_blocked = FALSE WHERE id = p_user_id;
  END IF;

END;
$$;

-- 3. Tentar migrar o estado atual da auth.users (caso haja utilizadores já bloqueados)
DO $$
BEGIN
  UPDATE public.users pu
  SET is_blocked = TRUE
  FROM auth.users au
  WHERE pu.id = au.id AND au.banned_until IS NOT NULL;
EXCEPTION WHEN OTHERS THEN
  -- Ignorar se houver erro de permissão ao ler auth.users (depende das regras no SQL Editor)
END;
$$;
